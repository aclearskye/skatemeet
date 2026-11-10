import type { Preview } from "@storybook/react-native";

import { StoryFrame, type StoryFrameKind } from "./StoryFrame";
import { StoryProviders } from "./StoryProviders";

const preview: Preview = {
  decorators: [
    (Story, { parameters }) => (
      <StoryProviders>
        <StoryFrame kind={(parameters.frame as StoryFrameKind | undefined) ?? "block"}>
          <Story />
        </StoryFrame>
      </StoryProviders>
    ),
  ],
};

export default preview;
