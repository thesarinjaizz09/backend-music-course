import createYearsTable from "../controllers/year.controller";

const runSetup = async () => {
    try {
      await createYearsTable();
      console.log('Years table setup complete.');
      process.exit(0); 
    } catch (error) {
      console.error('Error setting up years table:', error);
      process.exit(1); 
    }
  };
runSetup();
