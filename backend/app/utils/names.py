# Approved first names list
# Users must choose from this list to maintain some privacy
# (prevents unique names from being identifiable)

APPROVED_NAMES = {
    # Common English names (gender-neutral ordering)
    "Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Quinn", "Avery",
    "Sam", "Charlie", "Jamie", "Drew", "Skyler", "Reese", "Finley", "Rowan",

    # Common male names
    "James", "John", "Michael", "David", "Daniel", "Matthew", "Andrew", "Ryan",
    "William", "Joseph", "Thomas", "Christopher", "Anthony", "Mark", "Steven",
    "Paul", "Kevin", "Brian", "Jason", "Eric", "Adam", "Nathan", "Justin",
    "Brandon", "Tyler", "Aaron", "Benjamin", "Nicholas", "Kyle", "Jeremy",
    "Ethan", "Noah", "Lucas", "Mason", "Oliver", "Henry", "Sebastian", "Jack",
    "Leo", "Max", "Oscar", "Felix", "Hugo", "Arthur", "Louis", "Theo",

    # Common female names
    "Emma", "Olivia", "Sophia", "Isabella", "Mia", "Charlotte", "Amelia", "Emily",
    "Elizabeth", "Sofia", "Ella", "Grace", "Chloe", "Victoria", "Madison", "Luna",
    "Hannah", "Lily", "Zoe", "Nora", "Leah", "Hazel", "Violet", "Aurora",
    "Sarah", "Jessica", "Ashley", "Amanda", "Jennifer", "Stephanie", "Nicole",
    "Michelle", "Rachel", "Laura", "Katherine", "Rebecca", "Megan", "Anna",
    "Julia", "Claire", "Alice", "Lucy", "Ruby", "Eva", "Ivy", "Eleanor",

    # International names
    "Omar", "Ali", "Ahmed", "Yusuf", "Hassan", "Ibrahim", "Khalid", "Tariq",
    "Wei", "Ming", "Chen", "Lin", "Yuki", "Hana", "Kenji", "Sakura",
    "Maria", "Carlos", "Diego", "Sofia", "Pablo", "Elena", "Miguel", "Ana",
    "Pierre", "Marie", "Jean", "Sophie", "Luca", "Marco", "Giulia", "Elena",
    "Hans", "Klaus", "Anna", "Lukas", "Sven", "Erik", "Ingrid", "Freya",
}


def is_approved_name(name: str) -> bool:
    """Check if a name is in the approved list (case-insensitive)."""
    return name.strip().title() in APPROVED_NAMES


def get_approved_names() -> list[str]:
    """Get sorted list of approved names."""
    return sorted(APPROVED_NAMES)


def normalize_name(name: str) -> str:
    """Normalize a name to title case."""
    return name.strip().title()
