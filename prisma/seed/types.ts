import type {
  AmenityKey,
  FloodRisk,
  Furnishing,
  Gender,
  InquiryStatus,
  InquiryType,
  InternetType,
  ListingProviderType,
  NotificationType,
  PropertyStatus,
  PropertyType,
  RentPeriod,
  ReviewCategory,
  ReviewStatus,
  ReviewVerification,
  Role,
  SecurityFeature,
  VerificationStatus,
  VerificationType,
  WaterSource,
  CleanlinessHabit,
  SleepSchedule,
  StudyHabit,
  SocialPreference,
  NoiseTolerance,
  RoommateStatus,
} from "@prisma/client";

export type UniKey = "UNN" | "UNIZIK" | "UNILAG" | "OAU" | "ABU" | "COVENANT" | "FUTA" | "UNIBEN";

export type UserKey =
  | "admin"
  | "emeka"
  | "funke"
  | "musa"
  | "chidinma"
  | "tunde"
  | "blessing"
  | "segun"
  | "chi"
  | "tolu"
  | "aisha"
  | "ndidi"
  | "kevin"
  | "grace"
  | "yemi"
  | "halima"
  | "bola"
  | "zainab";

export interface Ids {
  universities: Map<UniKey, string>;
  campuses: Map<string, string>; // `${uniKey}:${campusSlug}`
  faculties: Map<string, string>; // `${uniKey}:${facultyName}`
  departments: Map<string, string>; // `${uniKey}:${facultyName}:${departmentName}`
  neighborhoods: Map<string, string>; // slug
  users: Map<UserKey, string>;
  properties: Map<string, string>; // slug
}

export interface SeedUniversity {
  key: UniKey;
  name: string;
  shortName: string;
  slug: string;
  city: string;
  state: string;
  campuses: { name: string; slug: string; latitude: number; longitude: number; city?: string }[];
  faculties?: { name: string; departments: string[] }[];
}

export interface SeedNeighborhood {
  name: string;
  slug: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
}

export interface SeedUser {
  key: UserKey;
  email: string;
  name: string;
  role: Role;
  password: string;
  phone?: string;
  gender?: Gender;
  university?: UniKey;
  campus?: string;
  faculty?: string;
  department?: string;
  level?: string;
  bio?: string;
  emailVerified?: boolean;
  createdAtDaysAgo?: number;
}

export interface SeedProperty {
  slug: string;
  title: string;
  description: string;
  houseRules?: string;
  owner: UserKey;
  providerType: ListingProviderType;
  status: PropertyStatus;
  verificationStatus: VerificationStatus;
  verificationNote?: string;
  rejectionReason?: string;
  propertyType: PropertyType;
  rentAmount: number;
  rentPeriod: RentPeriod;
  cautionDeposit?: number;
  agencyFee?: number;
  serviceCharge?: number;
  bedrooms: number;
  bathrooms: number;
  maxOccupants: number;
  furnishing: Furnishing;
  university: UniKey;
  campus?: string;
  neighborhood?: string;
  areaName: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  distanceKmToCampus?: number;
  locationApproximate?: boolean;
  addressLine?: string;
  availableNow?: boolean;
  availableFromDaysAhead?: number;
  isFeatured?: boolean;
  createdAtDaysAgo: number;
  amenities: AmenityKey[];
  features: string[];
  images: number;
  condition: {
    electricityAvailable: boolean;
    generatorAvailable?: boolean;
    solarAvailable?: boolean;
    prepaidMeter?: boolean;
    waterSource: WaterSource;
    internetType: InternetType;
    securityFeatures: SecurityFeature[];
    electricityReliability?: number;
    waterReliability?: number;
    networkQuality?: number;
    roadCondition?: number;
    noiseLevel?: number;
    cleanliness?: number;
    floodRisk?: FloodRisk;
  };
}

export interface SeedReview {
  property: string; // slug
  author: UserKey;
  overall: number;
  title: string;
  body: string;
  verification: ReviewVerification;
  status: ReviewStatus;
  months?: number;
  stayFromDaysAgo?: number;
  moderationReason?: string;
  response?: string;
  daysAgo: number;
  categoryOverrides?: Partial<Record<ReviewCategory, number>>;
}

export interface SeedInquiry {
  property: string; // slug
  student: UserKey;
  type: InquiryType;
  message: string;
  status: InquiryStatus;
  ownerResponse?: string;
  viewingInDays?: number;
  daysAgo: number;
}

export interface SeedRoommate {
  key: UserKey;
  status?: RoommateStatus;
  university: UniKey;
  campus?: string;
  locations: string[];
  budgetMin: number;
  budgetMax: number;
  roomType?: PropertyType;
  desiredRoommates: number;
  genderPreference?: Gender;
  smoking?: boolean;
  cleanliness: CleanlinessHabit;
  sleepSchedule: SleepSchedule;
  studyHabits: StudyHabit;
  socialPreference: SocialPreference;
  noiseTolerance: NoiseTolerance;
  moveInDays: number;
  bio: string;
  weights?: { budget?: number; location?: number; moveIn?: number; lifestyle?: number };
}

export interface SeedVerificationRequest {
  user: UserKey;
  type: VerificationType;
  status: VerificationStatus;
  note?: string;
  daysAgo: number;
}

export interface SeedReport {
  targetType: "PROPERTY" | "REVIEW" | "USER" | "MESSAGE" | "CONVERSATION";
  target: { kind: "property"; slug: string } | { kind: "user"; user: UserKey } | { kind: "message" };
  reason:
    | "FAKE_PROPERTY"
    | "SCAM"
    | "IMPERSONATION"
    | "SUSPICIOUS_PAYMENT_REQUEST"
    | "HARASSMENT"
    | "MISLEADING_INFORMATION"
    | "FAKE_REVIEW"
    | "SPAM"
    | "OTHER";
  details: string;
  reporter?: UserKey;
  anonymous?: boolean;
  status: "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "DISMISSED";
  resolution?: string;
  daysAgo: number;
}

export interface SeedNotification {
  user: UserKey;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  read?: boolean;
  daysAgo: number;
}

export interface SeedThread {
  a: UserKey;
  b: UserKey;
  subject: "GENERAL" | "ROOMMATE";
  property?: string; // slug
  messages: { from: UserKey; body: string; hoursAgo: number }[];
}
