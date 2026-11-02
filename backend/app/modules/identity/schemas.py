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


class LoginRequest(RegisterRequest):
    @field_validator("password", mode="before")
    @classmethod
    def password_length(cls, value):
        if not isinstance(value, str) or not 1 <= len(value) <= 128:
            raise ValueError("Ingresa una contraseña válida")
        return value


class RefreshRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    refresh_token: SecretStr

    @field_validator("refresh_token", mode="before")
    @classmethod
    def bounded_token(cls, value):
        if not isinstance(value, str) or not 20 <= len(value) <= 256:
            raise ValueError("Token inválido")
        return value


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    expires_in: int
