import cron from 'node-cron';
import db from '../db/db_connect';
import { Modules } from '../models/module.model';
import { fetchModuleAndVideosFromVimeo, syncDatabaseWithVimeoData, fetchAllModulesFromVimeo } from '../controllers/module.controller';
import { Videos } from '../models/video.model';
import { eq } from 'drizzle-orm';

async function deleteRemovedModules(removedModuleIds: string[]){
    for(const vimeoModuleId of removedModuleIds){
        try {
            const module = await db.select().from(Modules).where(eq(Modules.vimeo_module_id,vimeoModuleId)).execute();
            if(module.length === 0){
                console.warn(`Module with vimeo_module_id ${vimeoModuleId} not found in the database.`);
            }

            const moduleId = module[0].id;

            await db.transaction(async (trx) => {
                // Delete videos
                await trx.delete(Videos).where(eq(Videos.module_id, moduleId)).execute();
                // Delete module
                await trx.delete(Modules).where(eq(Modules.vimeo_module_id,vimeoModuleId)).execute();
            });
        } catch (error) {
            console.error(`Error deleting module ${vimeoModuleId}:`, error);
            
        }
    }
}


async function pollVimeoForUpdates() {
    try {
        console.log('Polling Vimeo for updates');
        // Step 1: Get all modules from Vimeo
        const allVimeoModules = await fetchAllModulesFromVimeo(); // Fetches all modules from Vimeo
        
        if (!allVimeoModules || !Array.isArray(allVimeoModules)) {
            throw new Error('Failed to fetch modules from Vimeo or invalid response format');
        }
        const vimeoModuleIds = allVimeoModules.map(module => module.vimeo_module_id);

        // Step 2: Get all modules currently in the database
        const dbModules = await db.select().from(Modules).execute();
        const dbModuleIds = dbModules.map(module => module.vimeo_module_id);

        // Step 3: Identify new modules not in the database
        const newModuleIds = vimeoModuleIds.filter(moduleId => !dbModuleIds.includes(moduleId));
        // Step 4: Sync new modules
        for (const moduleId of newModuleIds) {
            try {
                const {module, videos} = await fetchModuleAndVideosFromVimeo(moduleId);
                await db.transaction(async (trx) => {
                    // Insert new module and videos into the database
                    await trx.insert(Modules).values(module).execute();
                    for (const video of videos) {
                        await trx.insert(Videos).values(video).execute();
                        console.log("Added video -> ",video);
                    }
                })
            } catch (error) {
                console.error(`Error syncing new module ${moduleId}:`, error);
            }
        }

        // Step 5: Update existing modules
        for (const module of dbModules) {
            const moduleId = module.vimeo_module_id;
            try {
                const { module: vimeoModule, videos: vimeoVideos } = await fetchModuleAndVideosFromVimeo(moduleId,module.id);

                await syncDatabaseWithVimeoData(moduleId, vimeoModule, vimeoVideos);
            } catch (error) {
                console.error(`Error syncing existing module ${moduleId}:`, error);
            }
        }

        // Step 6: Delete modules that no longer exist on Vimeo
        const removedModuleIds = dbModuleIds.filter(moduleId => !vimeoModuleIds.includes(moduleId));
        await deleteRemovedModules(removedModuleIds);

        console.log('Vimeo updates polled and synced successfully');
    } catch (error) {
        console.error('Error in Vimeo sync job', error);
    }
}
cron.schedule('* * * * *', pollVimeoForUpdates);
