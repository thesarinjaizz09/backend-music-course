// import db from '../db/db_connect';
// import { Years } from '../models/year.model';
// import { eq } from "drizzle-orm";

// const createYearsTable = async () => {
//   // Year data with descriptions
//   const yearsWithDescriptions = [
//     { name: '1st Year', description: 'Freshman year, introductory modules.' },
//     { name: '2nd Year', description: 'Sophomore year, advanced modules and projects.' },
//     { name: '3rd Year', description: 'Junior year, specialized subjects and electives.' },
//     { name: '4th Year', description: 'Senior year, thesis and final projects.' },
//   ];

//   try {
//     // Insert data if it doesn't already exist
//     for (const { name, description } of yearsWithDescriptions) {
//       const existingYear = await db
//         .select()
//         .from(Years)
//         .where(eq(Years.name, name));

//       if (existingYear.length === 0) {
//         await db.insert(Years).values({ name, description });
//         console.log(`Year '${name}' with description '${description}' added.`);
//       } else {
//         console.log(`Year '${name}' already exists.`);
//       }
//     }
//   } catch (error) {
//     console.error('Error creating years table or inserting data:', error);
//   }
// };

// export default createYearsTable;
