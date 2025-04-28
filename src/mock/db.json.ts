// mocks/db.json.ts  (yes, a .ts file!)
import { Consumer } from '@interfaces/consumer';
import data from './db.json' assert { type: 'json' };  // Node ≥20
import { Provider } from '@interfaces/provider';

export type DBSchema = {
    consumers: Consumer[]
    providers: Provider[]
}

export default data as DBSchema; 