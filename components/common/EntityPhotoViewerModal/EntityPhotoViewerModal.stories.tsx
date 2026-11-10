import type { Meta, StoryObj } from "@storybook/react-native";
import { fn } from "storybook/test";

import { C } from "@/lib/theme";
import { SAMPLE_DATE, SAMPLE_PHOTO, SAMPLE_UUID } from "@/.rnstorybook/fixtures";
import { closing, ModalTrigger } from "@/.rnstorybook/ModalTrigger";

import { EntityPhotoViewerModal } from "./EntityPhotoViewerModal";

const meta = {
  title: "Common/EntityPhotoViewerModal",
  component: EntityPhotoViewerModal,
  args: {
    visible: false,
    onClose: fn(),
    photos: [
      {
        photo_id: SAMPLE_UUID,
        profile_id: SAMPLE_UUID,
        media_url: SAMPLE_PHOTO,
        upvote_count: 3,
        downvote_count: 0,
        is_hidden: false,
        created_at: SAMPLE_DATE,
      },
    ],
    isLoadingPhotos: false,
    currentUserId: null,
    voteStatuses: {},
    reportStatuses: {},
    onVote: fn(),
    onReport: fn(),
    isReporting: false,
    onDelete: fn(),
    isDeleting: false,
    accent: C.primary,
  },
  render: (args) => (
    <ModalTrigger>
      {(visible, close) => (
        <EntityPhotoViewerModal
          {...args}
          visible={visible}
          onClose={closing(args.onClose, close)}
        />
      )}
    </ModalTrigger>
  ),
} satisfies Meta<typeof EntityPhotoViewerModal>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
