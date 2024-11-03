
export type VimeoFolder = {
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
  
  export type VimeoVideo = {
    uri: string;              // URI to identify the video, e.g., "/videos/{video_id}"
    name: string;             // Video title
    description?: string;     // Video description
    duration: number;         // Duration in seconds
    pictures: {
      sizes: { width: number; height: number; link: string }[]; // Array of thumbnail sizes
    };
    link: string;             // Direct link to the video on Vimeo
    embed: {
      html: string;           // Embed HTML for the video player
    };
    // Add other fields from the Vimeo API response as needed
  }