import { NextFunction, Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler";
import vimeoAPI from "../config/vimeoConfig";
import { VimeoFolder, VimeoVideo } from "../@types/types";
import { v4 as uuidv4 } from "uuid"
import ApiError from "../utils/ApiError";
import db from "../db/db_connect";
import { Modules } from "../models/module.model";
import { VideoSchema } from "../schemas/videoSchema";
import { Videos } from "../models/video.model";
import { eq } from "drizzle-orm";


const VIMEO_USER_ID = process.env.VIMEO_USER_ID;

export const fetchAndStoreModule = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // get the moduleId from the request
    // check if the module exists in the database
    // if the module exists, fetch the videos from the database and return them
    // otherwise fetch the module from the vimeo server
    // fetch the videos from the vimeo server
    // store the module and videos in the database
   
    try {
        const { moduleId } = await req.params;
        if (!VIMEO_USER_ID) {
            throw new ApiError(500, "VIMEO_USER_ID is not configured in environment variables.");
        }
        if(!moduleId) {
            throw new ApiError(400, "Module ID is missing");
        }

        const existingModule = await db.select().from(Modules).where(eq(Modules.vimeo_module_id, moduleId)).execute();
        
        if (existingModule.length > 0) {
            const existingVideos = await db.select().from(Videos).where(eq(Videos.module_id, existingModule[0].id)).execute();
            res.status(200).json({
                statusCode: 200,
                message: "Module and videos fetched successfully",
                success: true,
                data: {
                    module: existingModule[0],
                    videos: existingVideos,
                },
            });
            return;
        }

        
        const folderResponse = await vimeoAPI.get<VimeoFolder>(`/users/${VIMEO_USER_ID}/projects/${moduleId}`);
        const vimeoFolder = folderResponse.data;
        
        const videosResponse = await vimeoAPI.get<{ data: VimeoVideo[] }>(`/users/${VIMEO_USER_ID}/projects/${moduleId}/videos`);
        const videos = videosResponse.data.data;
        
        const moduleData = {
            id: uuidv4(),
            vimeo_module_id: moduleId,
            title: vimeoFolder.name,
            description: vimeoFolder.description || '',
        }
    
        const videosData = videos.map(video => {
            const videoId = video.uri.split("/").pop();
            if (!videoId) {
                throw new ApiError(400, "Invalid video URI");
            }
            const videoData = {
                video_id: videoId,  // Extract video ID from URI
                module_id: moduleData.id,
                title: video.name,
                description: video.description,
                duration: video.duration,
                thumbnail_url: video.pictures.sizes[0]?.link,
                vimeo_url: video.link
            }

    
            const videoValidation = VideoSchema.safeParse(videoData);
            if(!videoValidation.success) {
                throw new ApiError(400, "Invalid video data");
            }
    
            return videoData;
        });
    
        await db.transaction(async (tx) => {
            await tx.insert(Modules).values(moduleData);
            await tx.insert(Videos).values(videosData);
        });
    
        res.status(200).json({
            statusCode: 200,
            message: "Module and videos saved successfully",
            success: true,
            data: {
                module: moduleData,
                videos: videosData,
            },
        });
    } catch (error) {
        if (error instanceof Error) {
            next(new ApiError(500, error.message));
        } else {
            next(new ApiError(500, "An unknown error occurred"));
        }
    }
})