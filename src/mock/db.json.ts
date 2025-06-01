// mocks/db.json.ts  (yes, a .ts file!)
import { Consumer } from '@store/consumers/profile/types';
import { Provider } from '@store/providers/profile/types';
import { Organization } from '@store/organizations/profile/types';
import data from './db.json' assert { type: 'json' };  // Node ≥20

export type DBSchema = {
    consumers: Consumer[]
    providers: Provider[]
    organizations: Organization[]
}

export default data as DBSchema; 