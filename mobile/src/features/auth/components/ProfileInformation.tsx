import { Platform } from "react-native";
import { Screen } from "../../../shared/ui/Screen";
import { Card } from "../../../shared/ui/Card";
import { AppText } from "../../../shared/ui/AppText";
export function ProfileInformation({
  section,
  active,
  onBack,
}: {
  section: "privacy" | "accessibility";
  active: boolean;
  onBack(): void;
}) {
  return (
    <Screen
      title={section === "privacy" ? "Privacidad y seguridad" : "Accesibilidad"}
      active={active}
      onBack={onBack}
      backLabel="Volver al perfil"
    >
      <Card>
        {section === "privacy" ? (
          <>
            <AppText>
              Tus movimientos y categorías se guardan en el servidor de FINZA y
              están asociados a tu cuenta. La caché financiera del teléfono se
              borra al cerrar sesión.
            </AppText>
            <AppText>
              Tu contraseña se protege con Argon2id. Las sesiones de acceso
              duran 15 minutos, con renovación rotatoria. El token de renovación
              se guarda en el almacenamiento seguro del dispositivo.
            </AppText>
            {Platform.OS === "web" ? (
              <AppText>
                En esta vista web, la sesión solo se conserva en memoria.
              </AppText>
            ) : null}
            <AppText>
              Sin anuncios ni envío de datos a terceros, sin IA en la nube. El
              registro rápido se interpreta en tu dispositivo.
            </AppText>
          </>
        ) : (
          <AppText>
            La app soporta lector de pantalla, texto grande y movimiento
            reducido. Los estados incluyen texto y no dependen solo del color.
          </AppText>
        )}
      </Card>
    </Screen>
  );
}
