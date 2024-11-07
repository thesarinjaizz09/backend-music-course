import cron from 'node-cron';
import db from '../db/db_connect';
import { Modules } from '../models/module.model';
import { fetchModuleAndVideosFromVimeo, syncDatabaseWithVimeoData } from '../controllers/module.controller';

async function pollVimeoForUpdates(){
    // get modules from database
    // for each module, fetch module and videos from vimeo using the function fetchModuleAndVideosFromVimeo
    // sync the database with the fetched data using the function syncDatabaseWithVimeoData
    // handle any errors that may occur during the sync process and log them for debugging
    // if no errors occur, log a success message to the console
    try {
        const modules = await db.select().from(Modules).execute();
        for(const module of modules) {
            const moduleId = module.vimeo_module_id;
            const vimeoData = await fetchModuleAndVideosFromVimeo(moduleId);
            await syncDatabaseWithVimeoData(moduleId, vimeoData);
        }
        console.log('Vimeo updates polled successfully');
    } catch (error) {
        console.error("Error in Vimeo sync job", error);
    }
}
// Run the pollVimeoForUpdates function every 6 hours
cron.schedule('0 */6 * * *', pollVimeoForUpdates);