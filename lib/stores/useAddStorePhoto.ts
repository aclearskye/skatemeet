import { useAuthContext } from "@/lib/context/use-auth-context";
import { pickPhoto, type PhotoSource } from "@/lib/storage";
import { queryKeys } from "@/utils/queryKeys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { addStorePhoto } from "./mutations";

export function useAddStorePhoto(storeId: string | null, osmPlaceId: string | null) {
  const { session } = useAuthContext();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  const mutation = useMutation({
    mutationFn: async (source: PhotoSource) => {
      if (!userId) throw new Error("Not authenticated");
      const photo = await pickPhoto(source);
      if (!photo) return null;
      const target = storeId ? { storeId } : { osmPlaceId: osmPlaceId! };
      return addStorePhoto(target, photo.uri, photo.mimeType, userId);
    },
    onSuccess: (mediaUrl) => {
      if (!mediaUrl) return;
      queryClient.invalidateQueries({ queryKey: queryKeys.storePhotos(storeId, osmPlaceId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.mapUserMarkersBase });
      queryClient.invalidateQueries({ queryKey: queryKeys.mapOsmMarkersBase });
    },
    onError: (error: Error) => {
      Alert.alert("Couldn't add photo", error.message ?? "Please try again.");
    },
  });

  return {
    addPhoto: (source: PhotoSource) => mutation.mutate(source),
    isAddingPhoto: mutation.isPending,
  };
}
