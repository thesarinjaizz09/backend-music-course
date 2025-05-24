
import { eq } from "drizzle-orm";
import { Request, Response, NextFunction } from "express";
import db from "../db/db_connect";
import { 
  userProfiles,
  users, 
} from "../models";
import ApiError from "../utils/ApiError";
import { UserWithProfile} from "../@types/types";
import { updateUserSchema } from "../schemas/userProfileSchema";
import { v4 as uuidv4 } from 'uuid';
import { userWithProfileSchema } from "../schemas/userWithProfileSchema";


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

    const validated = userWithProfileSchema.parse(result);
    res.status(200).json({ user: validated });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
