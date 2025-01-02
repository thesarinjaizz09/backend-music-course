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




type PurchaseDetails = {
  orderItemId: number;
  startDate: Date;
  endDate: Date | null;
  price: number;
  status: string;
}

type MonthData = {
  monthId: number;
  monthName: string;
  isAccessible: boolean;
}

type ModuleData = {
  moduleId: number;
  moduleName: string;
  isAccessible: boolean;
  months: MonthData[];
}

type YearData = {
  yearId: number;
  yearName: string;
  isAccessible: boolean;
  modules: ModuleData[];
}

type CourseAccess = {
  courseId: number;
  name: string;
  description: string | null;
  isFullAccess: boolean;
  purchases: PurchaseDetails[];
  years: YearData[];
}

export { 
  VimeoFolder, 
  VimeoVideo, 
  UserWithoutPassword, 
  VimeoItem,
  VimeoResponse,
  PurchaseDetails,
  MonthData,
  ModuleData,
  YearData,
  CourseAccess,
  UserWithProfile
};
