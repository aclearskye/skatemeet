import { castStorePhotoVote, deleteStorePhoto, reportStorePhoto } from "@/lib/stores/photoMutations";
import {
  fetchStorePhotos,
  getStorePhotoReportStatuses,
  getStorePhotoVoteStatuses,
} from "@/lib/stores/photoQueries";
import { StorePhoto } from "@/lib/stores/types";
import { EntityPhotosAdapter } from "@/lib/shared/useEntityPhotos";

export const storePhotosAdapter: EntityPhotosAdapter<StorePhoto> = {
  fetchPhotos: fetchStorePhotos,
  getVoteStatuses: getStorePhotoVoteStatuses,
  castVote: castStorePhotoVote,
  getReportStatuses: getStorePhotoReportStatuses,
  report: reportStorePhoto,
  deletePhoto: deleteStorePhoto,
};
