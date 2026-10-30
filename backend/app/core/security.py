from argon2 import PasswordHasher, Type

# Explicit Argon2id parameters; no manual salts or homemade cryptography.
password_hasher = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=4, type=Type.ID)


def hash_password(password: str) -> str:
    return password_hasher.hash(password)
