
type VimeoFolder =  {
  name: string;
  uri: string;
  metadata: {
    connections: {
      items: {
        uri: string;
        total: number;
      };
    };
  };
}


type VimeoVideo = {
  uri: string;
  name: string;
  description: string | null;
  duration: number;
  pictures: {
    sizes: Array<{
      link: string;
    }>;
  };
}

type VimeoItem = VimeoFolder | VimeoVideo;

type VimeoResponse = {
  data: Array<{
    type: 'folder' | 'video';
    folder?: VimeoFolder;
    video?: VimeoVideo;
  }>;
}

type UserWithoutPassword = {
    email: string;
    userId: number;
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

export { 
  VimeoFolder, 
  VimeoVideo, 
  UserWithoutPassword, 
  UserProfileData,
  VimeoItem,
  VimeoResponse
};
