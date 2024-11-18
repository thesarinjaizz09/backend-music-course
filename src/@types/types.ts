
type VimeoFolder = {
    uri: string;              // The URI for the folder (used for API requests)
    name: string;             // The name/title of the folder
    description: string;      // A description of the folder
    created_time: string;     // Timestamp of when the folder was created
    modified_time: string;    // Timestamp of when the folder was last modified
    videos: {
      total: number;          // Total number of videos in the folder
      data: Array<{
        uri: string;          // URI of the video
        name: string;         // Title of the video
        description: string;  // Description of the video
        duration: number;     // Duration of the video in seconds
        thumbnail_url?: string; // URL of the video's thumbnail (if available)
        link: string;         // Embed URL for video playback
      }>;
    };
  }
  
type VimeoVideo = {
    uri: string;              // Video URI
    name: string;             // Video title
    description?: string;     // Video description
    duration: number;         // Duration in seconds
    pictures: {
      sizes: { width: number; height: number; link: string }[]; 
    };
    link: string;             // Direct link to the video on Vimeo
    embed: {
      html: string;          
    };
}

type UserWithoutPassword = {
    email: string;
    id: string;
    username: string;
}

  //extra for future use
//   export type VimeoFolder = {
//     id: string;
//     name: string;
//     description?: string;
// };

// export type VimeoVideo = {
//     id: string;
//     name: string;
//     description?: string;
//     duration: number;
//     thumbnail_url: string;
//     vimeo_url: string;
// };

// export type VimeoData = {
//     folder: VimeoFolder;
//     videos: VimeoVideo[];
// };

type UserProfileData = {
    id: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    gender: string ;
    registeredAt: Date;
    enrolledModules: Array<{
      moduleId: string;
      title: string;
      description: string;
      enrollmentDate: Date;
      progress: string;
      completed: boolean;
    }>;
};

export { VimeoFolder, VimeoVideo, UserWithoutPassword, UserProfileData };
