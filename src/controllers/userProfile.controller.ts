


import { eq } from "drizzle-orm";
import { Request, Response, NextFunction } from "express";
import db from "../db/db_connect";
import { 
  users, 
} from "../models";
import ApiError from "../utils/ApiError";
import { UserWithProfile} from "../@types/types";

  
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
                  module: true,
                  videos: true
                }
              }
            }
          }, 
        },
      });
    
      

  
      const purchasedDetails: Array<{ type: string; details: any }> = userOrders.flatMap((order) =>
        order.orderItems.map((item) => {
          console.log(item.itemType);
      
          switch (item.itemType) {
            case "Course":
              if (!item.course) {
                console.warn("Missing course data for item:", item);
                return null;
              }
              return {
                type: "Course",
                details: {
                  [item.course.courseId]: {
                    courseName: item.course.courseName,
                    years: item.course.years.map((year: any) => ({ // Iterate over years array
                      yearId: year.yearId,
                      yearName: year.yearName,
                      modules: year.modules.map((module: any) => ({
                          moduleId: module.moduleId,
                          moduleName: module.moduleName,
                          months: module.months.map((month: any) => ({
                              monthId: month.monthId,
                              monthName: month.monthName,
                              videos:  month.videos.map((video: any) => ({
                                videoId: video.videoId,
                                videoTitle: video.videoTitle,
                                videoUrl: video.videoUrl,
                                description: video.description,
                                duration: video.duration,
                                thumbnailUrl: video.thumbnailUrl
                              }))
                          }))
                      }))
                  }))
                  }    
                }
              };
      
            case "Year":
              if (!item.year || !item.year.course) {
                console.warn("Missing year or course data for item:", item);
                return null;
              }
              return {
                type: "Year",
                details: {
                  [item.year.course.courseId]: {
                      courseName: item.year.course.courseName,
                      years: {
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
                                    videoTitle: video.videoTitle,
                                    videoUrl: video.videoUrl,
                                    description: video.description,
                                    duration: video.duration,
                                    thumbnailUrl: video.thumbnailUrl
                                  }))
                              }))
                          }))
                    }
                  }
              }
              };
      
            case "Module":
              if (!item.module || !item.module.course || !item.module.year) {
                console.warn("Missing module, course, or year data for item:", item);
                return null;
              }
              return {
                type: "Module",
                details: {
                  [item.module.course.courseId]: {
                    courseName: item.module.course.courseName,
                    years: {
                      yearId: item.module.year.yearId,
                      yearName: item.module.year.yearName,
                      modules: {
                        moduleId: item.module.moduleId,
                        moduleName: item.module.moduleName,
                        months: item.module.months.map((month: any) => ({
                          monthId: month.monthId,
                          monthName: month.monthName,
                          videos:  month.videos.map((video: any) => ({
                            videoId: video.videoId,
                            videoTitle: video.videoTitle,
                            videoUrl: video.videoUrl,
                            description: video.description,
                            duration: video.duration,
                            thumbnailUrl: video.thumbnailUrl
                          }))
                        }))
                      }
                    }
                  }
                }
              };

      
            case "Month":
              if (!item.month || !item.month.course || !item.month.year) {
                console.warn("Missing month, course, or year data for item:", item);
                return null;
              }
              return {
                type: "Month",
                details: {
                  [item.month.course.courseId]: {
                    courseName: item.month.course.courseName,
                    years: {
                      yearId: item.month.year.yearId,
                      yearName: item.month.year.yearName,
                      modules: {
                        moduleId: item.month.module.moduleId,
                        moduleName: item.month.module.moduleName,
                        months: {
                          monthId: item.month.monthId,
                          monthName: item.month.monthName,
                          videos: item.month.videos.map((video: any) => ({
                            videoId: video.videoId,
                            videoTitle: video.videoTitle,
                            videoUrl: video.videoUrl,
                            description: video.description,
                            duration: video.duration,
                            thumbnailUrl: video.thumbnailUrl
                          }))
                        }
                      }
                    }
                  }
                }
              };
      
            default:
              console.warn("Unknown item type:", item.itemType);
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

  
      // const organizeHierarchically = (userOrders: any): ParsedResponse => {
      //   const parsedResponse: ParsedResponse = {};
      
      //   userOrders.forEach((order: any) => {
      //     order.orderItems.forEach((item: any) => {
      //       switch (item.itemType) {
      //         case "Course": {
      //           if (!item.course) return;
                
      //           const courseId = item.course.courseId;
      //           if (!parsedResponse[courseId]) {
      //             parsedResponse[courseId] = {
      //               courseName: item.course.courseName,
      //               // vimeoCourseId: item.course.vimeoCourseId,
      //               years: []
      //             };
      //           }
      //           break;
      //         }
      
      //         case "Year": {
      //           if (!item.year?.course) return;
                
      //           const courseId = item.year.course.courseId;
      //           if (!parsedResponse[courseId]) {
      //             parsedResponse[courseId] = {
      //               courseName: item.year.course.courseName,
      //               // vimeoCourseId: item.year.course.vimeoCourseId,
      //               years: []
      //             };
      //           }
      
      //           const yearExists = parsedResponse[courseId].years.some(
      //             y => y.yearId === item.year.yearId
      //           );
      
      //           if (!yearExists) {
      //             parsedResponse[courseId].years.push({
      //               yearId: item.year.yearId,
      //               yearName: item.year.yearName,
      //               // vimeoYearId: item.year.vimeoYearId,
      //               modules: []
      //             });
      //           }
      //           break;
      //         }
      
      //         case "Module": {
      //           if (!item.module?.course || !item.module?.year) return;
                
      //           const courseId = item.module.course.courseId;
      //           if (!parsedResponse[courseId]) {
      //             parsedResponse[courseId] = {
      //               courseName: item.module.course.courseName,
      //               // vimeoCourseId: item.module.course.vimeoCourseId,
      //               years: []
      //             };
      //           }
      
      //           let year = parsedResponse[courseId].years.find(
      //             y => y.yearId === item.module.yearId
      //           );
      
      //           if (!year) {
      //             year = {
      //               yearId: item.module.yearId,
      //               yearName: item.module.year.yearName,
      //               // vimeoYearId: item.module.year.vimeoYearId,
      //               modules: []
      //             };
      //             parsedResponse[courseId].years.push(year);
      //           }
      
      //           const moduleExists = year.modules.some(
      //             m => m.moduleId === item.module.moduleId
      //           );
      
      //           if (!moduleExists) {
      //             year.modules.push({
      //               moduleId: item.module.moduleId,
      //               moduleName: item.module.moduleName,
      //               months: []
      //             });
      //           }
      //           break;
      //         }
      
      //         case "Month": {
      //           if (!item.month?.course || !item.month?.year) return;
                
      //           const courseId = item.month.course.courseId;
      //           if (!parsedResponse[courseId]) {
      //             parsedResponse[courseId] = {
      //               courseName: item.month.course.courseName,
      //               // vimeoCourseId: item.month.course.vimeoCourseId,
      //               years: []
      //             };
      //           }
      
      //           let year = parsedResponse[courseId].years.find(
      //             y => y.yearId === item.month.year.yearId
      //           );
      
      //           if (!year) {
      //             year = {
      //               yearId: item.month.year.yearId,
      //               yearName: item.month.year.yearName,
      //               // vimeoYearId: item.month.year.vimeoYearId,
      //               modules: []
      //             };
      //             parsedResponse[courseId].years.push(year);
      //           }
      
      //           let module = year.modules.find(
      //             m => m.moduleId === item.month.moduleId
      //           );
      
      //           if (!module) {
      //             module = {
      //               moduleId: item.month.moduleId,
      //               moduleName: item.month.module.moduleName,
      //               months: []
      //             };
      //             year.modules.push(module);
      //           }
      
      //           const monthExists = module.months.some(
      //             m => m.monthId === item.month.monthId
      //           );
      
      //           if (!monthExists) {
      //             module.months.push({
      //               monthId: item.month.monthId,
      //               monthName: item.month.monthName,
      //               videos: item.month.videos.map((video: any) => ({
      //                 videoId: video.videoId,
      //                 videoTitle: video.videoTitle,
      //                 videoUrl: video.videoUrl,
      //                 // videoVimeoId: video.videoVimeoId,
      //                 description: video.description,
      //                 duration: video.duration,
      //                 thumbnailUrl: video.thumbnailUrl
      //               }))
      //             });
      //           }
      //           break;
      //         }
      //       }
      //     });
      //   });
      
      //   return parsedResponse;
      // };
      
      // // Use in your API response
      // const parsedData = organizeHierarchically(userOrders);
      
      // res.status(200).json({
      //   user: user,
      //   orders: parsedData
      // });
    