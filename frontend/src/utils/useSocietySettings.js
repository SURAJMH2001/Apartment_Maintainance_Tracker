import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '../api/settings';

export const useSocietySettings = () => {
  return useQuery({
    queryKey: ['society-settings'],
    queryFn: async () => {
      try {
        const res = await settingsApi.getPublicSettings();
        return res.data;
      } catch (err) {
        return {
          display_name: 'NNG and NB Association',
          society_name: 'NNG and NB Association'
        };
      }
    },
    staleTime: 60 * 1000,
    retry: 1
  });
};

