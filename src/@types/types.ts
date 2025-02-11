import { User, UserProfile } from "../models";

//userProfile types
type UserProfileWithoutPassword = Omit<User, "password">;
type ProfileWithoutUserId = Omit<UserProfile, "userId">;

type UserWithProfile = UserProfileWithoutPassword & {
  profile: ProfileWithoutUserId | null; // Adjust nullability based on your schema
};

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




type Video = {
  videoId: number;
  videoTitle: string;
  videoUrl: string;
  description: string;
  duration: number;
  thumbnailUrl: string;
};

type Month = {
  monthId: number;
  monthName: string;
  videos: Video[];
};

type Module = {
  moduleId: number;
  moduleName: string;
  months: Month[];
};

type Year = {
  yearId: number;
  yearName: string;
  modules: Module[];
};

type Course = {
  courseId: number;
  courseName: string;
  years: Year[];
};

type OrderItem = {
  itemType: "Course" | "Year" | "Module" | "Month";
  course?: Course;
  year?: Year & { course: Course };
  module?: Module & { course: Course; year: Year };
  month?: Month & { course: Course; year: Year; module: Module };
};

type UserOrder = {
  orderItems: OrderItem[];
};


export { 
  VimeoFolder, 
  VimeoVideo, 
  UserWithoutPassword, 
  VimeoItem,
  VimeoResponse, 
  Video, 
  Month, 
  Module, 
  Year,
  Course,
  UserOrder,
  OrderItem,
  UserWithProfile
};
