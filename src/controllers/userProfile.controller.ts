
import { and, count, eq, inArray, sql } from "drizzle-orm";
import { Request, Response, NextFunction } from "express";
import db from "../db/db_connect";
import { 
  assignmentSubmissions,
  courses,
  examAttempts,
  exams,
  modules,
  months,
  orderItems,
  orders,
  userProfiles,
  users,
  years, 
} from "../models";
import ApiError from "../utils/ApiError";
import { UserWithProfile} from "../@types/types";
import { updateUserSchema } from "../schemas/userProfileSchema";
import { v4 as uuidv4 } from 'uuid';
import { userWithProfileSchema } from "../schemas/userWithProfileSchema";
import { CourseData, ExamData, ExamWeek, ModuleData, MonthData, YearData } from "../@types/profile.types";



export const getUserProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.userId) {
        throw new ApiError(401, 'Unauthorized');
      }
      const userId = req.user.userId;
  
      const user: UserWithProfile | undefined = await db.query.users.findFirst({
        where: eq(users.userId, userId),
        columns: {
          password: false,
        },
        with: {
          profile: {
            columns: {
              userId: false
            }
          }
        },
      });
  
      if (!user) {
        throw new ApiError(404, 'User not found');
      }
  
      const userOrders = await db.query.orders.findMany({
        where: (orders, { eq }) => eq(orders.userId, userId),
        columns: {},
        with: {
          orderItems: {
            columns: { itemType: true },
            with: {
              course: {
                columns: {
                  courseId: true,
                  courseName: true,
                },
                with: {
                  years: {
                    columns: {
                      yearId: true,
                      yearName: true,
                    },
                    with: {
                      modules: {
                        columns: {
                          moduleId: true,
                          moduleName: true,
                        },
                        with: {
                          months: {
                            columns: {
                              monthId: true,
                              monthName: true,
                            },
                            with: {
                              videos: {
                                columns: {
                                  videoId: true,
                                  videoVimeoId: true,
                                  videoTitle: true,
                                  videoUrl: true,
                                  description: true,
                                  duration: true,
                                  thumbnailUrl: true
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              },
              year: {
                columns: {
                  yearId: true,
                  yearName: true,
                },
                with: {
                  course: {
                    columns: {
                      courseId: true,
                      courseName: true,
                    },
                  },
                  modules: {
                    columns: {
                      moduleId: true,
                      moduleName: true,
                    },
                    with: {
                      months: {
                        columns: {
                          monthId: true,
                          monthName: true,
                        },
                        with: {
                          videos: {
                            columns: {
                              videoId: true,
                              videoVimeoId: true,
                              videoTitle: true,
                              videoUrl: true,
                              description: true,
                              duration: true,
                              thumbnailUrl: true
                            }
                          }
                        }
                      }
                    }
                  }
                }
              },
              module: {
                columns: {
                  moduleId: true,
                  moduleName: true,
                },
                with: {
                  course: {
                    columns: {
                      courseId: true,
                      courseName: true,
                    },
                  },
                  year: {
                    columns: {
                      yearId: true,
                      yearName: true,
                    },
                  },
                  months: {
                    columns: {
                      monthId: true,
                      monthName: true,
                    },
                    with: {
                      videos: {
                        columns: {
                          videoId: true,
                          videoVimeoId: true,
                          videoTitle: true,
                          videoUrl: true,
                          description: true,
                          duration: true,
                          thumbnailUrl: true
                        }
                      }
                    }
                  }
                }
              },
              month: {
                columns: {
                  monthId: true,
                  monthName: true,
                },
                with: {
                  course: {
                    columns: {
                      courseId: true,
                      courseName: true,
                    },
                  },
                  year: {
                    columns: {
                      yearId: true,
                      yearName: true,
                    },
                  },
                  module: {
                    columns: {
                      moduleId: true,
                      moduleName: true,
                    },
                  },
                  videos: {
                    columns: {
                      videoId: true,
                      videoVimeoId: true,
                      videoTitle: true,
                      videoUrl: true,
                      description: true,
                      duration: true,
                      thumbnailUrl: true
                    }
                  }
                }
              }
            }
          },
        },
      });
  
      const purchasedDetails: { [key: string]: any } = {};
  
      userOrders.forEach((order) => {
        order.orderItems.forEach((item) => {
          switch (item.itemType) {
            case "Course": {
              if (item.course) { 
                const courseData = {
                  courseName: item.course.courseName,
                  years: item.course.years.map((year: any) => ({
                    yearId: year.yearId,
                    yearName: year.yearName,
                    modules: year.modules.map((module: any) => ({
                      moduleId: module.moduleId,
                      moduleName: module.moduleName,
                      months: module.months.map((month: any) => ({
                        monthId: month.monthId,
                        monthName: month.monthName,
                        videos: month.videos.map((video: any) => ({
                          videoId: video.videoId,
                          videoVimeoId: video.videoVimeoId,
                          videoTitle: video.videoTitle,
                          videoUrl: video.videoUrl,
                          description: video.description,
                          duration: video.duration,
                          thumbnailUrl: video.thumbnailUrl
                        }))
                      }))
                    }))
                  }))
                };
                purchasedDetails[item.course.courseId] = courseData;
              }
              break;
            }
            case "Year": {
              if (item.year && item.year.course) {
                const courseId = item.year.course.courseId;
                if (!purchasedDetails[courseId]) {
                  purchasedDetails[courseId] = {
                    courseName: item.year.course.courseName,
                    years: []
                  };
                }
                
                const yearData = {
                  yearId: item.year.yearId,
                  yearName: item.year.yearName,
                  modules: item.year.modules.map((module: any) => ({
                    moduleId: module.moduleId,
                    moduleName: module.moduleName,
                    months: module.months.map((month: any) => ({
                      monthId: month.monthId,
                      monthName: month.monthName,
                      videos: month.videos.map((video: any) => ({
                        videoId: video.videoId,
                        videoVimeoId: video.videoVimeoId,
                        videoTitle: video.videoTitle,
                        videoUrl: video.videoUrl,
                        description: video.description,
                        duration: video.duration,
                        thumbnailUrl: video.thumbnailUrl
                      }))
                    }))
                  }))
                };
  
                const existingYearIndex = purchasedDetails[courseId].years.findIndex(
                  (y: any) => y.yearId === item.year?.yearId
                );
                if (existingYearIndex === -1) {
                  purchasedDetails[courseId].years.push(yearData);
                }else{
                  purchasedDetails[courseId].years[existingYearIndex] = yearData;
                }
              }
              break;
            }
            case "Module": {
              if (item.module && item.module.course && item.module.year) {
                const courseId = item.module.course.courseId;
                if (!purchasedDetails[courseId]) {
                  purchasedDetails[courseId] = {
                    courseName: item.module.course.courseName,
                    years: []
                  };
                }
  
                let yearIndex = purchasedDetails[courseId].years.findIndex(
                  (y: any) => y.yearId === item.module?.year.yearId
                );
                
                if (yearIndex === -1) {
                  purchasedDetails[courseId].years.push({
                    yearId: item.module.year.yearId,
                    yearName: item.module.year.yearName,
                    modules: []
                  });
                  yearIndex = purchasedDetails[courseId].years.length - 1;
                }
  
                const moduleData = {
                  moduleId: item.module.moduleId,
                  moduleName: item.module.moduleName,
                  months: item.module.months.map((month: any) => ({
                    monthId: month.monthId,
                    monthName: month.monthName,
                    videos: month.videos.map((video: any) => ({
                      videoId: video.videoId,
                      videoVimeoId: video.videoVimeoId,
                      videoTitle: video.videoTitle,
                      videoUrl: video.videoUrl,
                      description: video.description,
                      duration: video.duration,
                      thumbnailUrl: video.thumbnailUrl
                    }))
                  }))
                };
  
                const existingModuleIndex = purchasedDetails[courseId].years[yearIndex].modules.findIndex(
                  (m: any) => m.moduleId === item.module?.moduleId
                );
                if (existingModuleIndex === -1) {
                  purchasedDetails[courseId].years[yearIndex].modules.push(moduleData);
                }else {
                  purchasedDetails[courseId].years[yearIndex].modules[existingModuleIndex] = moduleData;
                }
              }
              break;
            }
            case "Month": {
              if (item.month && item.month.course && item.month.year && item.month.module) {
                const courseId = item.month.course.courseId;
                if (!purchasedDetails[courseId]) {
                  purchasedDetails[courseId] = {
                    courseName: item.month.course.courseName,
                    years: []
                  };
                }
  
                let yearIndex = purchasedDetails[courseId].years.findIndex(
                  (y: any) => y.yearId === item.month?.year.yearId
                );
                
                if (yearIndex === -1) {
                  purchasedDetails[courseId].years.push({
                    yearId: item.month.year.yearId,
                    yearName: item.month.year.yearName,
                    modules: []
                  });
                  yearIndex = purchasedDetails[courseId].years.length - 1;
                }
  
                let moduleIndex = purchasedDetails[courseId].years[yearIndex].modules.findIndex(
                  (m: any) => m.moduleId === item.month?.module.moduleId
                );
  
                if (moduleIndex === -1) {
                  purchasedDetails[courseId].years[yearIndex].modules.push({
                    moduleId: item.month.module.moduleId,
                    moduleName: item.month.module.moduleName,
                    months: []
                  });
                  moduleIndex = purchasedDetails[courseId].years[yearIndex].modules.length - 1;
                }
  
                const monthData = {
                  monthId: item.month.monthId,
                  monthName: item.month.monthName,
                  videos: item.month.videos.map((video: any) => ({
                    videoId: video.videoId,
                    videoVimeoId: video.videoVimeoId,
                    videoTitle: video.videoTitle,
                    videoUrl: video.videoUrl,
                    description: video.description,
                    duration: video.duration,
                    thumbnailUrl: video.thumbnailUrl
                  }))
                };
  
                const existingMonthIndex = purchasedDetails[courseId].years[yearIndex].modules[moduleIndex].months.findIndex(
                  (m: any) => m.monthId === item.month?.monthId
                );
                if (existingMonthIndex === -1) {
                  purchasedDetails[courseId].years[yearIndex].modules[moduleIndex].months.push(monthData);
                }else{
                  purchasedDetails[courseId].years[yearIndex].modules[moduleIndex].months[existingMonthIndex] = monthData;
                }
              }
              break;
            }
            default:
              console.warn("Unknown item type:", item.itemType);
          }
        });
      });
  
      res.status(200).json({
        user: user,
        orders: purchasedDetails
      });
  
    } catch (error) {
      console.error('Error in getUserProfile:', error);
      throw new ApiError(500, 'Internal Server Error');
    }
};


export const updateUserDetails = async (req: Request, res: Response): Promise<void>  => {
    //parsed data from request body
    //check if user exists
    //if user exists then update the users table and userProfiles tables
    //if the profile doesn't exist then insert otherwise update it
    //find the updated user and remove the password field
    //send back the updated values
  try {
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
       res.status(400).json({ error: parsed.error.flatten() });
       return;
    }

    const { userId, username, email, fullName, gender } = parsed.data;

    const existingUser = await db.query.users.findFirst({
      where: eq(users.userId, userId),
    });

    if (!existingUser) {
       res.status(404).json({ error: 'User not found' });
        return;
    }

    if (username || email) {
      await db
        .update(users)
        .set({
          ...(username && { username }),
          ...(email && { email }),
        })
        .where(eq(users.userId, userId));
    }

    const existingProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, userId),
    });

    if (fullName || gender) {
      if (existingProfile) {
        await db
          .update(userProfiles)
          .set({
            ...(fullName && { fullName }),
            ...(gender && { gender }),
          })
          .where(eq(userProfiles.userId, userId));
      } else {
        await db.insert(userProfiles).values({
          id: uuidv4(),
          userId,
          fullName: fullName || null,
          gender: gender || 'male', 
        });
      }
    }

    const updatedUser = await db.query.users.findFirst({
      where: eq(users.userId, userId),
      with: {
        profile: true,
      },
    });

    if (!updatedUser) {
      res.status(500).json({ error: 'Failed to fetch updated user.' });
      return;
    }

    const { password, ...safeUser } = updatedUser;

    res.status(200).json({
      message: 'User details updated successfully.',
      user: safeUser,
    });
     return;
  } catch (error) {
    console.error('Update failed:', error);
    res.status(500).json({ error: 'Internal server error.' });
     return;
  }
};


export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, email } = req.user ?? {};

    if (!userId && !email) {
      res.status(400).json({ message: 'Missing user identity' });
      return;
    }

    const result = await db
      .select({
        userId: users.userId,
        username: users.username,
        email: users.email,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        profile: {
          id: userProfiles.id,
          fullName: userProfiles.fullName,
          gender: userProfiles.gender,
          createdAt: userProfiles.createdAt,
          updatedAt: userProfiles.updatedAt,
        },
      })
      .from(users)
      .leftJoin(userProfiles, eq(users.userId, userProfiles.userId))
      .where(userId ? eq(users.userId, userId) : eq(users.email, email))
      .limit(1)
      .then((rows) => rows[0]);

    if (!result) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    const userIdToUse = result.userId;

    const userOrders = await db
      .select({
        orderId: orders.orderId,
        itemType: orderItems.itemType,
        itemName: orderItems.itemName,
        paymentStatus: orders.paymentStatus,
      })
      .from(orders)
      .innerJoin(orderItems, eq(orders.orderId, orderItems.orderId))
      .where(
        and(
          eq(orders.userId, userIdToUse),
          eq(orders.paymentStatus, 'succeeded')
        )
      );

    if (userOrders.length === 0) {
      const validated = userWithProfileSchema.parse(result);
      res.status(200).json({ 
        user: validated,
        courses: []
      });
      return;
    }
    const purchasedCourses = userOrders
      .filter(item => item.itemType.toLowerCase() === 'course')
      .map(item => item.itemName);

    if (purchasedCourses.length === 0) {
      const validated = userWithProfileSchema.parse(result);
      res.status(200).json({ 
        user: validated,
        courses: []
      });
      return;
    }

    const courseData = await db
      .select({
        courseId: courses.courseId,
        courseName: courses.courseName,
      })
      .from(courses)
      .where(inArray(courses.courseName, purchasedCourses));

    if (courseData.length === 0) {
      const validated = userWithProfileSchema.parse(result);
      res.status(200).json({ 
        user: validated,
        courses: []
      });
      return;
    }
    const courseIds = courseData.map(c => c.courseId);

    const yearData = await db
      .select({
        yearId: years.yearId,
        yearName: years.yearName,
        courseId: years.courseId,
      })
      .from(years)
      .where(inArray(years.courseId, courseIds));

    const yearIds = yearData.map(y => y.yearId);

    const moduleData = await db
      .select({
        moduleId: modules.moduleId,
        moduleName: modules.moduleName,
        courseId: modules.courseId,
        yearId: modules.yearId,
      })
      .from(modules)
      .where(inArray(modules.yearId, yearIds));


    const moduleIds = moduleData.map(m => m.moduleId);

    const monthData = await db
      .select({
        monthId: months.monthId,
        monthName: months.monthName,
        courseId: months.courseId,
        yearId: months.yearId,
        moduleId: months.moduleId,
      })
      .from(months)
      .where(inArray(months.moduleId, moduleIds));

    const examData = await db
      .select({
        examId: exams.examId,
        courseId: exams.courseId,
        yearId: exams.yearId,
        weekNumber: exams.weekNumber,
        type: exams.type,
        title: exams.title,
        totalMarks: exams.totalMarks,
      })
      .from(exams)
      .where(
        and(
          inArray(exams.courseId, courseIds),
          inArray(exams.yearId, yearIds)
        )
      );
    const examIds = examData.map(exam => exam.examId);

    // Fetch user's exam attempts
    const examAttemptsData = await db
      .select({
        attemptId: examAttempts.attemptId,
        examId: examAttempts.examId,
        attemptNumber: examAttempts.attemptNumber,
        passed: examAttempts.passed,
        submittedAt: examAttempts.submittedAt,
        gradedAt: examAttempts.gradedAt,
      })
      .from(examAttempts)
      .where(
        and(
          eq(examAttempts.userId, userIdToUse),
          inArray(examAttempts.examId, examIds)
        )
      );

    // Fetch assignment submissions
    const assignmentSubmissionsData = await db
      .select({
        examId: assignmentSubmissions.examId,
        attemptId: assignmentSubmissions.attemptId,
        totalMarks: assignmentSubmissions.totalMarks,
        isChecked: assignmentSubmissions.isChecked,
        passed: assignmentSubmissions.passed,
        feedback: assignmentSubmissions.feedback,
      })
      .from(assignmentSubmissions)
      .where(
        and(
          eq(assignmentSubmissions.userId, userIdToUse),
          inArray(assignmentSubmissions.examId, examIds)
        )
      );

    // Structure the data hierarchically
    const structuredData: CourseData[] = courseData
      .map(course => {
        const courseYears = yearData.filter(year => year.courseId === course.courseId);
        
        const filteredYears: YearData[] = courseYears
          .map(year => {
            const yearModules = moduleData.filter(module => 
              module.courseId === course.courseId && module.yearId === year.yearId
            );
             
            const filteredModules: ModuleData[] = yearModules
              .map(module => {
                const moduleMonths = monthData.filter(month => 
                  month.moduleId === module.moduleId
                );
                
                const filteredMonths: MonthData[] = moduleMonths
                  .map(month => {
                    const monthExams = getExamsForMonth(month, examData, year.yearId);
                    const weeks = generateWeeksForMonth(month, monthExams, examAttemptsData, assignmentSubmissionsData);
                    
                    // Only return month if it has exam weeks
                    if (weeks.length > 0) {
                      return {
                        monthId: month.monthId,
                        monthName: month.monthName,
                        weeks: weeks
                      };
                    }
                    return null;
                  })
                  .filter((month): month is MonthData => month !== null);
                
                // Only return module if it has months with exams
                if (filteredMonths.length > 0) {
                  return {
                    moduleId: module.moduleId,
                    moduleName: module.moduleName,
                    months: filteredMonths
                  };
                }
                return null;
              })
              .filter((module): module is ModuleData => module !== null);
            
            // Only return year if it has modules with exams
            if (filteredModules.length > 0) {
              return {
                yearId: year.yearId,
                yearName: year.yearName,
                modules: filteredModules
              };
            }
            return null;
          })
          .filter((year): year is YearData => year !== null);
        
        if (filteredYears.length > 0) {
          return {
            courseId: course.courseId,
            courseName: course.courseName,
            years: filteredYears
          };
        }
        return null;
      })
      .filter((course): course is CourseData => course !== null);

    const validated = userWithProfileSchema.parse(result);
    
    res.status(200).json({ 
      user: validated,
      courses: structuredData
    });
    
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

//Hepler functions for getProfile
function getExamsForMonth(month: any, examData: any[],  yearId: number): any[] {
  const monthName = month.monthName;
  const monthNumber = parseInt(monthName.replace('Month ', ''));
  
  const examWeeks: number[] = [];
  const yearBaseMonth = (yearId - 1) * 12;
  const relativeMonth = monthNumber - yearBaseMonth;
  
  switch (relativeMonth) {
    case 4: examWeeks.push(13); break;
    case 7: examWeeks.push(26); break;
    case 10: examWeeks.push(39); break;
    case 12: examWeeks.push(52); break;
  }
  
  return examData.filter(exam => 
    examWeeks.includes(exam.weekNumber) && exam.yearId === yearId
  );
}

//Hepler functions for getProfile
function generateWeeksForMonth(
  month: any, 
  monthExams: any[], 
  examAttemptsData: any[], 
  assignmentSubmissionsData: any[]
): ExamWeek[] {
  const weeks: ExamWeek[] = [];
  
  if (monthExams.length > 0) {
    const weekMap = new Map<number, ExamData[]>();
    
    monthExams.forEach(exam => {
      if (!weekMap.has(exam.weekNumber)) {
        weekMap.set(exam.weekNumber, []);
      }
      
      const userAttempts = examAttemptsData.filter(attempt => attempt.examId === exam.examId);
      const latestAttempt = userAttempts.length > 0 
        ? userAttempts.reduce((latest, current) => 
            current.attemptNumber > latest.attemptNumber ? current : latest
          )
        : null;
      
      const examSubmission = assignmentSubmissionsData.find(sub => sub.examId === exam.examId);
      
      const cleared = latestAttempt?.passed || false;
      const attempts = userAttempts.length;
      const review = examSubmission?.isChecked === false && examSubmission?.passed === null;
      const failed = latestAttempt?.passed === false || examSubmission?.passed === false;
      
      let marks = null;
      if (exam.type === 'final' && examSubmission?.totalMarks) {
        marks = parseFloat(examSubmission.totalMarks);
      }
      
      weekMap.get(exam.weekNumber)!.push({
        examId: exam.examId,
        title: exam.title,
        type: exam.type,
        cleared,
        attempts,
        review,
        failed,
        marks
      });
    }); 

    for (const [weekNumber, exams] of weekMap.entries()) {
      weeks.push({ weekNumber, exams });
    }
    
    weeks.sort((a, b) => a.weekNumber - b.weekNumber);
  }
  
  return weeks;
}
