import type {
  AmenityKey,
  PropertyType,
  RentPeriod,
  ReviewCategory,
  ReportReason,
  InquiryType,
} from "@/lib/types";

export const SITE_NAME = "StudentNest";
export const SITE_TAGLINE = "Find a place you can trust.";
export const SITE_DESCRIPTION =
  "Find affordable student accommodation in Nigeria, compare real living conditions, and hear from students who have stayed there before.";

export const SAFETY_WARNING =
  "Never send money solely because someone contacted you through StudentNest. Always inspect the property physically and verify the owner or agent before paying.";

export const VERIFICATION_EXPLAINER =
  "Verified means our team confirmed the listing details with the owner/caretaker and checked supporting evidence. Verification does not guarantee quality, ownership, or absence of scams — always inspect before paying.";

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  SELF_CONTAIN: "Self-contain",
  SINGLE_ROOM: "Single room",
  FLAT: "Flat",
  APARTMENT: "Apartment",
  DUPLEX: "Duplex",
  BUNGALOW: "Bungalow",
  HOSTEL_ROOM: "Hostel room",
  SHARED_ROOM: "Shared room",
  STUDIO: "Studio",
  OTHER: "Other",
};

export const RENT_PERIOD_LABELS: Record<RentPeriod, string> = {
  PER_MONTH: "month",
  PER_SEMESTER: "semester",
  PER_SESSION: "session",
  PER_YEAR: "year",
};

export const AMENITY_LABELS: Record<AmenityKey, string> = {
  WATER: "Water supply",
  ELECTRICITY: "Electricity",
  GENERATOR: "Generator",
  SOLAR: "Solar power",
  INTERNET: "Internet",
  WIFI: "Wi-Fi",
  PARKING: "Parking",
  KITCHEN: "Kitchen",
  LAUNDRY: "Laundry",
  SECURITY: "Security",
  FENCED_COMPOUND: "Fenced compound",
  CCTV: "CCTV",
  PREPAID_METER: "Prepaid meter",
  SHARED_FACILITIES: "Shared facilities",
  FURNITURE: "Furniture",
  AIR_CONDITIONING: "Air conditioning",
  WARDROBE: "Wardrobe",
  EN_SUITE: "En-suite bathroom",
  BALCONY: "Balcony",
  TILED_FLOOR: "Tiled floor",
};

export const REVIEW_CATEGORY_LABELS: Record<ReviewCategory, string> = {
  ELECTRICITY: "Electricity",
  WATER: "Water",
  SECURITY: "Security",
  INTERNET: "Internet / Network",
  CLEANLINESS: "Cleanliness",
  LANDLORD_BEHAVIOUR: "Landlord / Caretaker behaviour",
  MAINTENANCE: "Maintenance response",
  ACCESSIBILITY: "Accessibility",
  VALUE_FOR_MONEY: "Value for money",
  NOISE_ENVIRONMENT: "Noise / Environment",
};

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  FAKE_PROPERTY: "Fake property",
  SCAM: "Scam",
  IMPERSONATION: "Impersonation",
  SUSPICIOUS_PAYMENT_REQUEST: "Suspicious payment request",
  HARASSMENT: "Harassment",
  MISLEADING_INFORMATION: "Misleading property information",
  FAKE_REVIEW: "Fake review",
  UNSAFE_BEHAVIOUR: "Unsafe behaviour",
  SPAM: "Spam",
  PERSONAL_INFORMATION: "Exposes personal information",
  THREATS: "Threats",
  INAPPROPRIATE_CONTENT: "Inappropriate content",
  EXTORTION: "Extortion",
  ADVERTISING: "Advertising",
  OTHER: "Other",
};

export const INQUIRY_TYPE_LABELS: Record<InquiryType, string> = {
  AVAILABILITY: "Is this property still available?",
  VIEWING_REQUEST: "Can I schedule a viewing?",
  TOTAL_COST: "How much is the total cost?",
  DISTANCE: "How far is it from campus?",
  OTHER: "Other question",
};

export const INQUIRY_PRESETS = Object.entries(INQUIRY_TYPE_LABELS).map(
  ([value, label]) => ({ value, label }),
);

export const PROVIDER_TYPE_LABELS = {
  LANDLORD: "Landlord",
  CARETAKER: "Caretaker",
  AGENT: "Agent",
} as const;

export const PROPERTY_STATUS_LABELS = {
  DRAFT: "Draft",
  PENDING_REVIEW: "Pending review",
  ACTIVE: "Active",
  REJECTED: "Rejected",
  SUSPENDED: "Suspended",
  RENTED_OUT: "Rented out",
  DELETED: "Deleted",
} as const;

export const VERIFICATION_STATUS_LABELS = {
  PENDING: "Pending verification",
  VERIFIED: "Verified",
  REJECTED: "Rejected",
  SUSPENDED: "Suspended",
} as const;

export const REVIEW_STATUS_LABELS = {
  PUBLISHED: "Published",
  UNDER_REVIEW: "Under review",
  HIDDEN: "Hidden",
  REJECTED: "Rejected",
  DISPUTED: "Disputed",
} as const;

export const REVIEW_VERIFICATION_LABELS = {
  VERIFIED_STAY: "Verified stay",
  VERIFIED_REVIEWER: "Verified reviewer",
  UNVERIFIED: "Unverified",
} as const;

export const FURNISHING_LABELS = {
  FURNISHED: "Furnished",
  PARTIALLY_FURNISHED: "Partially furnished",
  UNFURNISHED: "Unfurnished",
} as const;

export const WATER_SOURCE_LABELS = {
  BOREHOLE: "Borehole",
  PUBLIC_WATER: "Public water",
  TANK: "Water tank",
  WELL: "Well",
  OTHER: "Other",
  NONE: "None",
} as const;

export const INTERNET_TYPE_LABELS = {
  FIBRE: "Fibre",
  MOBILE_NETWORK: "Mobile network",
  WIFI: "Wi-Fi",
  NONE: "None",
} as const;

export const SECURITY_FEATURE_LABELS = {
  FENCED_COMPOUND: "Fenced compound",
  SECURITY_PERSONNEL: "Security personnel",
  CCTV: "CCTV",
  GATE: "Gate",
} as const;

export const FLOOD_RISK_LABELS = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  UNKNOWN: "Unknown",
} as const;

export const CLEANLINESS_LABELS = {
  VERY_TIDY: "Very tidy",
  BALANCED: "Balanced",
  RELAXED: "Relaxed",
} as const;

export const SLEEP_SCHEDULE_LABELS = {
  EARLY_BIRD: "Early bird",
  NIGHT_OWL: "Night owl",
  FLEXIBLE: "Flexible",
} as const;

export const STUDY_HABIT_LABELS = {
  STUDIES_AT_HOME: "Studies at home",
  STUDIES_OUTSIDE: "Studies outside (library etc.)",
  MIXED: "Mix of both",
} as const;

export const SOCIAL_PREFERENCE_LABELS = {
  VERY_SOCIAL: "Very social",
  OCCASIONALLY_SOCIAL: "Occasionally social",
  QUIET_PRIVATE: "Quiet & private",
} as const;

export const NOISE_TOLERANCE_LABELS = {
  LOW: "Prefers quiet",
  MEDIUM: "Moderate noise OK",
  HIGH: "Noise tolerant",
} as const;

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "rent_asc", label: "Lowest rent" },
  { value: "rent_desc", label: "Highest rent" },
  { value: "closest", label: "Closest to campus" },
  { value: "most_reviewed", label: "Most reviewed" },
  { value: "highest_rated", label: "Highest rated" },
] as const;

export const PAGE_SIZE = 12;

export const NIGERIAN_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
  "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT - Abuja","Gombe",
  "Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos",
  "Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto",
  "Taraba","Yobe","Zamfara",
] as const;
