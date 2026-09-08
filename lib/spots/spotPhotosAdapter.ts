import { castSpotPhotoVote, deleteSpotPhoto, reportSpotPhoto } from "@/lib/spots/photoMutations";
import {
  fetchSpotPhotos,
  getSpotPhotoReportStatuses,
  getSpotPhotoVoteStatuses,
} from "@/lib/spots/photoQueries";
import { SpotPhoto } from "@/lib/spots/types";
import { EntityPhotosAdapter } from "@/lib/shared/useEntityPhotos";

export const spotPhotosAdapter: EntityPhotosAdapter<SpotPhoto> = {
  fetchPhotos: fetchSpotPhotos,
  getVoteStatuses: getSpotPhotoVoteStatuses,
  castVote: castSpotPhotoVote,
  getReportStatuses: getSpotPhotoReportStatuses,
  report: reportSpotPhoto,
  deletePhoto: deleteSpotPhoto,
};
