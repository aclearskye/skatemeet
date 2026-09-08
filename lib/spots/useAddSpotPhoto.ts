import { useAuthContext } from "@/lib/context/use-auth-context";
import { pickPhotoFromLibrary } from "@/lib/storage";
import { queryKeys } from "@/utils/queryKeys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { addSpotPhoto } from "./mutations";

export function useAddSpotPhoto(spotId: string | null, osmPlaceId: string | null) {
  const { session } = useAuthContext();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Not authenticated");
      const photo = await pickPhotoFromLibrary();
      if (!photo) return null;
      const target = spotId ? { spotId } : { osmPlaceId: osmPlaceId! };
      return addSpotPhoto(target, photo.uri, photo.mimeType, userId);
    },
    onSuccess: (mediaUrl) => {
      if (!mediaUrl) return;
      queryClient.invalidateQueries({ queryKey: queryKeys.spotPhotos(spotId, osmPlaceId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.mapUserMarkersBase });
      queryClient.invalidateQueries({ queryKey: queryKeys.mapOsmMarkersBase });
    },
    onError: (error: Error) => {
      Alert.alert("Couldn't add photo", error.message ?? "Please try again.");
    },
  });

  return {
    addPhoto: () => mutation.mutate(),
    isAddingPhoto: mutation.isPending,
  };
}
