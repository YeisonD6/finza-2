import { useEffect, useRef, useState } from "react";
import { Banner } from "../../../shared/ui/Banner";
import { announce } from "../../../shared/accessibility/announcements";
import { success } from "../../../shared/theme/haptics";
/** Keep this hook in the detail so entering forms does not reset the completion event. */
export function useGoalCelebration(completed: boolean, active = true) {
  const seen = useRef(false);
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!active) {
      setShow(false);
      return;
    }
    if (completed && !seen.current) {
      seen.current = true;
      setShow(true);
      announce("¡Meta cumplida!");
      void success();
    }
  }, [completed, active]);
  return show;
}
export function GoalCelebration({ show }: { show: boolean }) {
  return (
    <Banner
      message={show ? "¡Meta cumplida!" : ""}
      tone="success"
      celebrate
      announce={false}
    />
  );
}
