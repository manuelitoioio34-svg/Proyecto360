// server/database/user.ts

// Mongoose model para usuarios del sistema
import mongoose from "mongoose";

export type UserRole = 'admin' | 'operario' | 'tecnico' | 'cliente';

/** Datos del perfil corporativo sincronizados desde el JWT de Datalake en cada login SSO */
export interface SsoProfile {
  usuario?:             string;  // strUsuario  — username en Datalake
  cargo?:               string;  // strCargo    — cargo/puesto del empleado
  area?:                string;  // strArea     — área o departamento
  rolApp?:              string;  // strRolApp   — rol en la aplicación Datalake (futuro: mapear a permisos)
  ccosto?:              string;  // strCcosto   — centro de costo
  ccostoResponsable?:   string;  // strCcostoResponsable
  uen?:                 string;  // strUEN      — unidad de negocio
  paisNomina?:          string;  // strPaisNomina
  ciudadNomina?:        string;  // strCiudadNomina
}

export interface UserDoc extends mongoose.Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  title?: string;
  isActive: boolean;
  authMethod?: 'local' | 'sso';
  lastLogin?: Date | null;
  /** Perfil corporativo sincronizado desde Datalake en cada login SSO */
  ssoProfile?: SsoProfile;
  // Verification & recovery
  emailVerified?: boolean;
  verificationToken?: string | null;
  verificationTokenExpires?: Date | null;
  resetPasswordToken?: string | null;
  resetPasswordExpires?: Date | null;
  userOverrides?: { allow?: string[]; deny?: string[] };
  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = new mongoose.Schema<UserDoc>({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, index: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin','operario','tecnico','cliente'], default: 'cliente', index: true },
  title: { type: String },
  authMethod: { type: String, enum: ['local', 'sso'], default: 'local' },
  ssoProfile: {
    usuario:           { type: String },
    cargo:             { type: String },
    area:              { type: String },
    rolApp:            { type: String },
    ccosto:            { type: String },
    ccostoResponsable: { type: String },
    uen:               { type: String },
    paisNomina:        { type: String },
    ciudadNomina:      { type: String },
  },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date, default: null },
  // Verification & recovery
  emailVerified: { type: Boolean, default: false },
  verificationToken: { type: String, default: null, index: true },
  verificationTokenExpires: { type: Date, default: null },
  resetPasswordToken: { type: String, default: null, index: true },
  resetPasswordExpires: { type: Date, default: null },
  userOverrides: {
    allow: { type: [String], default: [] },
    deny: { type: [String], default: [] },
  } as any,
}, { timestamps: true, collection: 'users' });

const User = mongoose.model<UserDoc>('User', UserSchema);
export default User;
