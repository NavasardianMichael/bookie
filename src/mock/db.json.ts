// mocks/db.json.ts  (yes, a .ts file!)
import data from './db.json' assert { type: 'json' };  // Node ≥20

export type DBSchema = {
    consumers: Consumer[]
    providers: Provider[]
}

export default data as DBSchema; 