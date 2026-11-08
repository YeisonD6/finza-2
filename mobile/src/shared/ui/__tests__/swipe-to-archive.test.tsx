import React from "react";
import { Pressable, Text } from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { GestureHandlerRootView, State } from "react-native-gesture-handler";
import {
  fireGestureHandler,
  getByGestureTestId,
} from "react-native-gesture-handler/jest-utils";
import { ARCHIVE_THRESHOLD, SwipeToArchive } from "../SwipeToArchive";

async function swipe(translationX: number, velocityX = -200) {
  await act(() =>
    fireGestureHandler(getByGestureTestId("swipe"), [
      { state: State.BEGAN, translationX: 0 },
      { state: State.ACTIVE, translationX: translationX / 2 },
      { translationX },
      { state: State.END, translationX, velocityX },
    ]),
  );
}
async function renderRow(onArchive = jest.fn(), disabled = false) {
  await render(
    <GestureHandlerRootView>
      <SwipeToArchive testID="swipe" onArchive={onArchive} disabled={disabled}>
        <Text>Fila</Text>
      </SwipeToArchive>
    </GestureHandlerRootView>,
  );
  return onArchive;
}

test("letting go past the threshold asks to archive once", async () => {
  const onArchive = await renderRow();
  await swipe(-(ARCHIVE_THRESHOLD + 30));
  expect(onArchive).toHaveBeenCalledTimes(1);
  // The reveal stays while the row springs back, then goes; confirmation decides
  // whether the movement disappears.
  const reveal = () =>
    screen.queryByText("Archivar", { includeHiddenElements: true });
  expect(reveal()).not.toBeNull();
  await act(() => new Promise((resolve) => setTimeout(resolve, 300)));
  expect(reveal()).toBeNull();
});

test("a short, slow swipe springs back without archiving", async () => {
  const onArchive = await renderRow();
  await swipe(-(ARCHIVE_THRESHOLD / 2), -200);
  expect(onArchive).not.toHaveBeenCalled();
});

test("a quick flick past half the threshold counts", async () => {
  const onArchive = await renderRow();
  await swipe(-(ARCHIVE_THRESHOLD / 2 + 10), -1400);
  expect(onArchive).toHaveBeenCalledTimes(1);
});

test("swiping right never archives", async () => {
  const onArchive = await renderRow();
  await swipe(ARCHIVE_THRESHOLD * 2, 1400);
  expect(onArchive).not.toHaveBeenCalled();
});

test("a swipe's release is not also read as a tap on the row", async () => {
  const onPress = jest.fn();
  await render(
    <GestureHandlerRootView>
      <SwipeToArchive testID="swipe" onArchive={jest.fn()}>
        {(guard) => (
          <Pressable accessibilityRole="button" onPress={guard(onPress)}>
            <Text>Fila</Text>
          </Pressable>
        )}
      </SwipeToArchive>
    </GestureHandlerRootView>,
  );
  await swipe(-(ARCHIVE_THRESHOLD / 2));
  await fireEvent.press(screen.getByRole("button", { name: "Fila" }));
  expect(onPress).not.toHaveBeenCalled();
  await act(() => new Promise((resolve) => setTimeout(resolve, 450)));
  await fireEvent.press(screen.getByRole("button", { name: "Fila" }));
  expect(onPress).toHaveBeenCalledTimes(1);
});
