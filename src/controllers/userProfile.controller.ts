


import { eq } from "drizzle-orm";
import { Request, Response, NextFunction } from "express";
import db from "../db/db_connect";
import { 
  users, 
} from "../models";
import ApiError from "../utils/ApiError";
import { UserWithProfile } from "../@types/types";

  
  export const getUserProfile = async (req: Request, res: Response,  next: NextFunction): Promise<void> => {
    try {
        if (!req.user || !req.user.userId) {
            throw new ApiError(401, 'Unauthorized');
          }
      const userId = req.user.userId; // Assuming middleware sets this
  
      // Get user data with profile
      const user: UserWithProfile | undefined = await db.query.users.findFirst({
        where: eq(users.userId, userId),
        columns:{
          password: false,
        },
        with: {
          profile: {
            columns:{
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
            columns: {itemType:true},
            with: {
              course: {
                with: {
                  years: {
                    with: {
                      modules: {
                        with: {
                          months: {
                            with: {
                              videos: true
                            }
                          }
                        }
                      }
                    }
                  }
                }
              },
              year: {
                with: {
                  course: true,
                  modules: {
                    with: {
                      months: {
                        with: {
                          videos: true
                        }
                      }
                    }
                  }
                }
              },
              module: {
                with: {
                  course: true,
                  year: true,
                  months: {
                    with: {
                      videos: true
                    }
                  }
                }
              },
              month: {
                with: {
                  course: true,
                  year: true,
                  videos: true
                }
              }
            }
          }, 
        },
      });

      const purchasedDetails = userOrders.flatMap((order) => 
        order.orderItems.map((item) => {
          console.log(item.itemType);
          switch (item.itemType) {
            case "Course":
              console.log("course selected", item.course);
              return {
                type: 'Course',
              
                details: {
                  ...item.course,
                  // years: item.course?.years.map((year) => ({
                  //   ...year,
                  //   modules: year.modules.map((module) => ({
                  //     ...module,
                  //     months: module.months.map((month) => ({
                  //       ...month,
                  //       videos: month.videos,
                  //     })),
                  //   })),
                  // })),
                }
              };
            case 'Year':
              return {
                type: 'Year',
                course: {
                  ...item.year.course,
                },
                details: {
                  yearId: item.year.yearId,
                  courseId: item.year.courseId,
                  yearName: item.year.yearName,
                  modules: item.year.modules
                },
              };
            case 'Module':
              return {
                type: 'Module',
                course: {
                  ...item.module.course,
                },
                year: {
                  ...item.module.year,
                },
                details: {
                  moduleId: item.module.moduleId,
                  courseId: item.module.courseId,
                  yearId: item.module.yearId,
                  moduleName: item.module.moduleName,
                  months: item.module.months,
                },
              };
              case 'Month':
                return {
                  type: 'Month',
                  course: {
                    ...item.month.course,
                  },
                  year: {
                    ...item.month.year,
                  },
                  details: {
                    monthId: item.month.monthId,
                    vimeoMonthId: item.month.vimeoMonthId,
                    monthName: item.month.monthName,
                    moduleId: item.month.moduleId,
                    videos: item.month.videos,
                  },
                };
            default:
              return null;
          }
        })
      ).filter((item) => item !== null);
      

      res.status(200).json({
        user: user,
        // orders: userOrders,
        orders: purchasedDetails
        // purchases
      });
  
    } catch (error) {
      console.error('Error in getUserProfile:', error);
       throw new ApiError(500, 'Internal Server Error');
    }
  };

  
