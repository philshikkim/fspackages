/**
 * A class that handles searching for nearest VOR stations.
 */
export class CJ4_NearestVORSearch {

  /**
   * Searches for the nearest VOR stations to the current aircraft position.
   * @param distance The maximum distance in NM to search.
   * @param maxItems The maximum number of VOR stations to return.
   */
  public static async searchNearest(distance: number, maxItems: number): Promise<VORStation[]> {
    const lat = SimVar.GetSimVarValue("GPS POSITION LAT", "degree latitude");
    const long = SimVar.GetSimVarValue("GPS POSITION LON", "degree longitude");
    const instrId = 'CJ4_FMC';

    const batch = new SimVar.SimVarBatch("C:fs9gps:NearestVorItemsNumber", "C:fs9gps:NearestVorCurrentLine");
    batch.add("C:fs9gps:NearestVorCurrentICAO", "string", "string");
    batch.add("C:fs9gps:NearestVorCurrentDistance", "nautical miles", "number");
    batch.add("C:fs9gps:NearestVorCurrentFrequency", "MHz", "number");

    const startSearch = async () => {
      await SimVar.SetSimVarValue("C:fs9gps:NearestVorCurrentLatitude", "degree latitude", lat, instrId);
      await SimVar.SetSimVarValue("C:fs9gps:NearestVorCurrentLongitude", "degree longitude", long, instrId);
      await SimVar.SetSimVarValue("C:fs9gps:NearestVorMaximumItems", "number", maxItems, instrId);
      await SimVar.SetSimVarValue("C:fs9gps:NearestVorMaximumDistance", "nautical miles", distance, instrId);
    };
    
    await startSearch();
    await new Promise<void>(async (resolve) => {
      let numItems = 0;
      let retries = 0;

      const checkNumItems = () => {
        setTimeout(() => {
          const currentNumItems = SimVar.GetSimVarValue('C:fs9gps:NearestVorItemsNumber', 'number', instrId);
          if (currentNumItems === 0 || currentNumItems !== numItems) {
            if (currentNumItems === 0) {
              retries++;
            }

            if (retries > 8) {
              retries = 0;
              startSearch().then(() => {});
            }
            numItems = currentNumItems;
            checkNumItems();
          }
          else {
            resolve();
          }
        }, 250);
      };

      checkNumItems();
    });

    return await new Promise<VORStation[]>((resolve) => SimVar.GetSimVarArrayValues(batch, values => {
      resolve(values.map(vor => ({
        icao: vor[0],
        distance: vor[1],
        frequency: parseFloat(vor[2].toFixed(2))
      })));
    }, instrId));
  }
}

/** A VOR station. */
export interface VORStation {
  icao: string,
  frequency: number;
  distance: number;
}