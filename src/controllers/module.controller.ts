import { NextFunction, Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler";
import vimeoAPI from "../config/vimeoConfig";
import { VimeoFolder, VimeoVideo } from "../@types/types";
import { v4 as uuidv4 } from "uuid"
import ApiError from "../utils/ApiError";
import db from "../db/db_connect";
import { Module, Modules } from "../models/module.model";
import { ModuleSchema, VideoSchema, VideoSchemaType } from "../schemas/videoAndModuleSchema";
import { Videos } from "../models/video.model";
import { eq } from "drizzle-orm";


const VIMEO_USER_ID = process.env.VIMEO_USER_ID;

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


//to fetch all the modules from the vimeo server
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


const fetchModuleAndVideosFromVimeo = async (moduleId: string) => {
    //fetch the module and videos from the vimeo server
    //return the data
    const folderResponse = await vimeoAPI.get<VimeoFolder>(`/users/${VIMEO_USER_ID}/projects/${moduleId}`);
    const vimeoFolder = folderResponse.data;
    
    const videosResponse = await vimeoAPI.get<{ data: VimeoVideo[] }>(`/users/${VIMEO_USER_ID}/projects/${moduleId}/videos`);
    const videos = videosResponse.data.data;
    
    return {vimeoFolder, videos};
};

const syncDatabaseWithVimeoData = async (moduleId: string, vimeoData: {vimeoFolder: VimeoFolder; videos: VimeoVideo[]}) => {
    // decode vimeo folder and videos from vimeo data
    // create module data
    // check if the module exists in the database
    // if it exists, update the module data
    // otherwise insert the module data
    // for each video, create video data
    // check if the video exists in the database
    // if it exists, update the video data
    // otherwise insert the video data
    const { vimeoFolder, videos } = vimeoData;

    const moduleData: Module = {
        id: uuidv4(),
        vimeo_module_id: moduleId,
        title: vimeoFolder.name,
        description: vimeoFolder.description || '',
    };
    // Validate module data
    const parsedModuleData = ModuleSchema.parse(moduleData);

    const existingModule = await db.select().from(Modules).where(eq(Modules.vimeo_module_id, moduleId)).execute();

    if (existingModule.length > 0) {
        await db.update(Modules).set(parsedModuleData).where(eq(Modules.vimeo_module_id, moduleId)).execute();
    } else {
        await db.insert(Modules).values(parsedModuleData).execute();
    }
    for (const video of videos) {
        const videoData: VideoSchemaType = {
            video_id: video.uri.split("/").pop()!,
            module_id: parsedModuleData.id,
            title: video.name,
            description: video.description,
            duration: video.duration,
            thumbnail_url: video.pictures.sizes[0]?.link,
            vimeo_url: video.link,
        };

        // Validate video data
        const parsedVideoData = VideoSchema.parse(videoData);

        const existingVideo = await db.select().from(Videos).where(eq(Videos.video_id, parsedVideoData.video_id)).execute();

        if (existingVideo.length > 0) {
            await db.update(Videos).set(parsedVideoData).where(eq(Videos.video_id, parsedVideoData.video_id)).execute();
        } else {
            await db.insert(Videos).values(parsedVideoData).execute();
        }
    }
};

export {fetchAndStoreModule, fetchAndStoreAllModules, fetchModuleAndVideosFromVimeo, syncDatabaseWithVimeoData};