import { NextFunction, Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler";
import vimeoAPI from "../config/vimeoConfig";
import { VimeoFolder, VimeoVideo } from "../@types/types";
import { v4 as uuidv4 } from "uuid"
import ApiError from "../utils/ApiError";
import db from "../db/db_connect";
import { Module, Modules } from "../models/module.model";
import { ModuleSchema, VideoSchema, VideoSchemaType } from "../schemas/videoAndModuleSchema";
import { Video, Videos } from "../models/video.model";
import { eq } from "drizzle-orm";
import axios from "axios";


const VIMEO_USER_ID = process.env.VIMEO_USER_ID;
//to fetch all videos from  modules
const fetchAndStoreModule = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    //fetch the moduleId from the request params
    //check if the module exists in the database
    //if it exists, fetch the module and videos from the database
    //and return the module and videos
    // otherwise respond with error and a warning message
    try {
        const { moduleId } = req.params;

        if (!moduleId) {
            throw new ApiError(400, "Module ID is missing");
        }

        const existingModule = await db.select().from(Modules).where(eq(Modules.vimeo_module_id, moduleId)).execute();
        
        if (existingModule.length > 0) {
            const existingVideos = await db.select().from(Videos).where(eq(Videos.module_id, existingModule[0].id)).execute();
            res.status(200).json({
                statusCode: 200,
                message: "Module and videos fetched successfully from database",
                success: true,
                data: {
                    module: existingModule[0],
                    videos: existingVideos,
                },
            });
        } else {
            res.status(404).json({
                statusCode: 404,
                message: "Module not found in database",
                success: false,
                data: null,
            });
        }
    } catch (error) {
        if (error instanceof Error) {
            next(new ApiError(500, error.message));
        } else {
            next(new ApiError(500, "An unknown error occurred"));
        }
    }
});


//to fetch all the modules from the database
const fetchAndStoreAllModules = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    //fetch all the modules from the database
    //if no modules are found, respond with a warning message
    //otherwise respond with the modules
    try {
        const existingModules = await db.select().from(Modules).execute();
        if (existingModules.length === 0) {
            res.status(404).json({
                statusCode: 404,
                message: "No modules found in database",
                success: false,
                data: null,
            })
        };
        res.status(200).json({
            statusCode: 200,
            message: "Modules fetched successfully from database",
            success: true,
            data: existingModules,
        });
    } catch (error) {
        console.dir(error);
        if (error instanceof Error) {
            next(new ApiError(500, error.message));
        } else {
            next(new ApiError(500, "An unknown error occurred"));
        }
    }
});

const fetchAllModulesFromVimeo = async () => {
    //fetch all the modules from the vimeo server
    //return the data
    try {
        const foldersResponse = await vimeoAPI.get<{ data: VimeoFolder[] }>(`/users/${VIMEO_USER_ID}/projects`);
        const vimeoFolders = foldersResponse.data.data;
        if (!vimeoFolders || vimeoFolders.length === 0) {
            console.warn('No modules found on Vimeo');
        }
        // Extract only the required properties for each module
        const modulesData = vimeoFolders.map(folder => ({
            vimeo_module_id: folder.uri.split("/").pop()!,
        }));
        return modulesData;
    } catch (error) {
        console.error('Error fetching modules from Vimeo:', error);
        throw new Error('Failed to fetch modules from Vimeo');
    }
}

const fetchModuleAndVideosFromVimeo = async (moduleId: string,existingModuleId?: string) => {
    //fetch the module and videos from the vimeo server
    //return the data
    try {
        const folderResponse = await vimeoAPI.get<VimeoFolder>(`/users/${VIMEO_USER_ID}/projects/${moduleId}`);
        const vimeoFolder = folderResponse.data;
        const module: Module = {
            id:  existingModuleId || uuidv4(),
            vimeo_module_id: moduleId,
            title: vimeoFolder.name,
            description: vimeoFolder.description || '',
        };

        const videosResponse = await vimeoAPI.get<{ data: VimeoVideo[] }>(`/users/${VIMEO_USER_ID}/projects/${moduleId}/videos`);
        const videosData = videosResponse.data.data;
        if (!videosData || videosData.length === 0) {
            console.warn(`No videos found for module ${moduleId}`);
        }

        const videos: Omit<Video, 'id'>[] = videosData.map((video: any) => ({
            video_id: video.uri.split("/").pop(),
            module_id: module.id,
            title: video.name,
            description: video.description || "",
            duration: video.duration,
            thumbnail_url: video.pictures.sizes[0]?.link || "",
            vimeo_url: video.link,
        }))
        return {module, videos};
    } catch (error) {
        console.error(`Error fetching data from Vimeo for module ${moduleId}:`, error);
        throw error;
    }
};


const syncDatabaseWithVimeoData = async (moduleId: string, vimeoModule: Module, vimeoVideos: Omit<Video, "id">[]) => {
    //fetch the module from database
    try {
        const module = await db.select().from(Modules).where(eq(Modules.vimeo_module_id, moduleId)).execute();
    
        // 1. Check if  module data has changed
        const moduleUpdated = vimeoModule.title !== module[0].title || vimeoModule.description !== module[0].description;
        if(moduleUpdated) {
            await db.update(Modules)
            .set({ title: vimeoModule.title, description: vimeoModule.description})
            .where(eq(Modules.vimeo_module_id, moduleId))
            .execute();
        }
        // 2. Check  for new or  deleted videos
        const dbVideos = await db.select().from(Videos).where(eq(Videos.module_id, module[0].id)).execute();
        const dbVideoIds = dbVideos.map(video => video.video_id);
    
        // New videos
        const newVideos = vimeoVideos.filter(video => !dbVideoIds.includes(video.video_id));
        for(const video of newVideos) {
            const videoData = {
                video_id: video.video_id,
                module_id: module[0].id,
                title: video.title,
                description: video.description,
                duration: video.duration,
                thumbnail_url: video.thumbnail_url,
                vimeo_url: video.vimeo_url,
            }
            await db.insert(Videos).values(videoData).execute();
        }
    
        // Deleted videos
        const deletedVideos = dbVideos.filter(dbVideo => !vimeoVideos.some(video => video.video_id === dbVideo.video_id));
        for (const video of deletedVideos) {
            await db.delete(Videos).where(eq(Videos.video_id, video.video_id)).execute();
        }
    
        // 3. Check for updated videos
        for(const video of vimeoVideos) {
            const videoId = video.video_id;
            const existingVideo = dbVideos.find(dbVideo => dbVideo.video_id === videoId);
            if(existingVideo) {
                const videoUpdated = existingVideo.title !== video.title || existingVideo.description !== video.description || existingVideo.duration !== video.duration || existingVideo.thumbnail_url !== video.thumbnail_url || existingVideo.vimeo_url !== video.vimeo_url;
                if(videoUpdated){
                    const videoData = {
                        title: video.title,
                        description: video.description,
                        duration: video.duration,
                        thumbnail_url: video.thumbnail_url,
                        vimeo_url: video.vimeo_url,
                    };
                    await db.update(Videos).set(videoData).where(eq(Videos.video_id, videoId)).execute();
                }
            }
        }
    } catch (error) {
        console.error(`Error syncing module '${moduleId}' with Vimeo data:`, error);
    }
};


//to fetch all the modules from the vimeo server
const testfetchAndStoreAllModules = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    //chech if the vimeo userId is available
    //fetch all the folders from the vimeo server
    //for each module, check if it exists in the database
    //if it does not exist, store it in the database
    //send a response
    console.log("Entering");
    if(!VIMEO_USER_ID){
        throw new ApiError(500, "VIMEO_USER_ID is not configured in environment variables.");
    }
    try {
        console.log("starting.....");
        const foldersResponse = await vimeoAPI.get<{ data: VimeoFolder[] }>(`/users/${VIMEO_USER_ID}/projects`);
        const vimeoFolders = foldersResponse.data.data;
        console.dir(vimeoFolders);
        const modulesData: Module[] = [];
        for(const folder of vimeoFolders){
            const moduleId = folder.uri.split("/").pop();
            if(!moduleId){
                continue;
            }
            const existingModule = await db.select().from(Modules).where(eq(Modules.vimeo_module_id, moduleId)).execute();
            if(existingModule.length > 0){
                continue;
            }
            const moduleData = {
                id: uuidv4(),
                vimeo_module_id: moduleId,
                title: folder.name,
                description: folder.description || '',
            }
            modulesData.push(moduleData);
        }
        if(modulesData.length > 0){
            await db.transaction(async (tx) => {
                await tx.insert(Modules).values(modulesData);
            });
        }
        res.status(200).json({
            statusCode: 200,
            message: "Modules fetched and stored successfully",
            success: true,
            data: modulesData,
        });
    } catch (error) {
        console.dir(error);
        if (error instanceof Error) {
            next(new ApiError(500, error.message));
        } else {
            next(new ApiError(500, "An unknown error occurred"));
        }
        
    }
});

export {fetchAndStoreModule, fetchAndStoreAllModules, fetchModuleAndVideosFromVimeo, syncDatabaseWithVimeoData, fetchAllModulesFromVimeo, testfetchAndStoreAllModules};
