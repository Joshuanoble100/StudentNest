import type {
  AmenityKey,
  PropertyType,
  RentPeriod,
  ReviewCategory,
  ReportReason,
  InquiryType,
  Role,
  UserStatus,
  InquiryStatus,
  ReportStatus,
  ReportTargetType,
  NotificationType,
  Gender,
  RoommateStatus,
  PaymentStatus,
  PaymentPurpose,
  VerificationType,
} from "@/lib/types";

export const SITE_NAME = "StudentNest";
export const SITE_TAGLINE = "Find a place you can trust.";
export const SITE_DESCRIPTION =
  "Find affordable student accommodation in Nigeria, compare real living conditions, and hear from students who have stayed there before.";

export const SAFETY_WARNING =
  "Never send money solely because someone contacted you through StudentNest. Always inspect the property physically and verify the owner or agent before paying.";

export const VERIFICATION_EXPLAINER =
  "Verified means our team confirmed the listing details with the owner/caretaker and checked supporting evidence. Verification does not guarantee quality, ownership, or absence of scams — always inspect before paying.";

/** Featured is a paid placement — it must never be presented as a quality signal. */
export const FEATURED_EXPLAINER =
  "Featured is a paid placement bought by the owner to appear higher in results. It is not a review score, not a verification, and not a recommendation from StudentNest.";

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

// -- Statuses & enums used by dashboards and the admin panel -----------------

export const ROLE_LABELS: Record<Role, string> = {
  STUDENT: "Student",
  LANDLORD: "Landlord",
  AGENT: "Caretaker / Agent",
  ADMIN: "Admin",
};

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  DELETED: "Deleted",
};

export const INQUIRY_STATUS_LABELS: Record<InquiryStatus, string> = {
  NEW: "New",
  RESPONDED: "Responded",
  VIEWING_SCHEDULED: "Viewing scheduled",
  CLOSED: "Closed",
};

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  OPEN: "Open",
  UNDER_REVIEW: "Under review",
  RESOLVED: "Resolved",
  DISMISSED: "Dismissed",
};

export const REPORT_TARGET_LABELS: Record<ReportTargetType, string> = {
  PROPERTY: "Property",
  REVIEW: "Review",
  USER: "User",
  MESSAGE: "Message",
  CONVERSATION: "Conversation",
};

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  INQUIRY_NEW: "New inquiry",
  INQUIRY_RESPONSE: "Inquiry response",
  MESSAGE_NEW: "New message",
  ROOMMATE_MATCH: "Roommate match",
  FAVORITE_PRICE_CHANGE: "Price change",
  FAVORITE_AVAILABLE: "Now available",
  NEW_MATCHING_PROPERTY: "New matching listing",
  REVIEW_RESPONSE: "Review response",
  REVIEW_RECEIVED: "Review received",
  LISTING_APPROVED: "Listing approved",
  LISTING_REJECTED: "Listing rejected",
  VERIFICATION_STATUS: "Verification update",
  SUSPICIOUS_ACTIVITY: "Suspicious activity",
  ACCOUNT_ALERT: "Account alert",
};

export const GENDER_LABELS: Record<Gender, string> = {
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Other",
  PREFER_NOT_TO_SAY: "Prefer not to say",
};

export const ROOMMATE_STATUS_LABELS: Record<RoommateStatus, string> = {
  ACTIVE: "Active — visible to other students",
  PAUSED: "Paused — hidden while you look",
  HIDDEN: "Hidden",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Pending",
  SUCCESS: "Paid",
  FAILED: "Failed",
  REFUNDED: "Refunded",
};

export const PAYMENT_PURPOSE_LABELS: Record<PaymentPurpose, string> = {
  FEATURED_LISTING: "Featured listing",
  VERIFIED_LANDLORD_SERVICE: "Verified landlord service",
  LISTING_PROMOTION: "Listing promotion",
  PREMIUM_TOOLS: "Premium tools",
};

export const VERIFICATION_TYPE_LABELS: Record<VerificationType, string> = {
  IDENTITY: "Identity",
  OWNERSHIP: "Property ownership",
  AGENCY_LICENSE: "Agency licence",
};

export const STUDENT_LEVELS = ["100", "200", "300", "400", "500", "600", "Postgraduate"] as const;

/** Selectable option lists derived from the label maps above. */
export const propertyTypeOptions = Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));
export const amenityOptions = Object.entries(AMENITY_LABELS).map(([value, label]) => ({
  value,
  label,
}));
