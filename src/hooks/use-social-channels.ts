import { useMemo } from "react";
import { useSiteSetting } from "@/hooks/use-site-setting";
import {
  DEFAULT_SOCIAL_CHANNELS,
  SOCIAL_CHANNELS_KEY,
  normalizeConfig,
  type SocialChannelsConfig,
} from "@/lib/social-channels";

export function useSocialChannels() {
  const { value, loading, update } = useSiteSetting<SocialChannelsConfig>(
    SOCIAL_CHANNELS_KEY,
    DEFAULT_SOCIAL_CHANNELS,
  );
  const config = useMemo(() => normalizeConfig(value), [value]);
  return { config, loading, update };
}
