from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, SecretStr, field_validator


class RegisterRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr
    password: SecretStr

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.lower()

    @field_validator("password", mode="before")
    @classmethod
    def password_length(cls, value):
        if not isinstance(value, str) or not 12 <= len(value) <= 128:
            raise ValueError("La contraseña debe tener entre 12 y 128 caracteres")
        return value


class AccountResponse(BaseModel):
    id: UUID
    email: str
    base_currency: str
