import db from "../db/db_connect";
import { Module, Modules } from "../models/module.model";
import { Year, Years } from "../models/year.model";
import { eq } from "drizzle-orm";

const assignModulesToYears = async (): Promise<void> => {
    // fetch all the modules from the database
    // fetch all the years from the database
    // assign modules to years based on conditions
    // update the modules with the assigned year id
    try {
        const modules: Module[] = await db.select().from(Modules).execute();
        const years: Year[] = await db.select().from(Years).execute();

        if(modules.length === 0){
            console.log("No modules found in the database.");
            return;
        }

        if(years.length === 0){
            console.log("No years found in the database.");
            return;
        }

        for(const module of modules){
            let assignedYearId: string | null = null;
            if(module.title.includes('Module 1')){
                assignedYearId = years.find((year) => year.name === '1st Year')?.id || null;
            }else if(module.title.includes('Module 2')){
                assignedYearId = years.find((year) => year.name === '2nd Year')?.id || null;
            }else if(module.title.includes('Module 3')){
                assignedYearId = years.find((year) => year.name === '3rd Year')?.id || null;
            }else if(module.title.includes('Module 4')){
                assignedYearId = years.find((year) => year.name === '4th Year')?.id || null;
            }

            if(assignedYearId){
                await db.update(Modules)
                .set({ year_id: assignedYearId })
                .where(eq(Modules.id, module.id))
                .execute();
                console.log(`Assigned '${module.title}' to ${years.find((year) => year.id === assignedYearId)?.name}`);
            }else {
                console.log(`No year found for '${module.title}'`);
            }
        }
        console.log("Module assignment in completed.");
        process.exit(0); 

    } catch (error) {
        console.error('Error assigning modules to years:', error);
        process.exit(1); 
    }
};
assignModulesToYears();
