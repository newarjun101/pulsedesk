# Integration Guide (Official APIs Only)

## Supported Platforms
1. **Facebook**: Meta Graph API + Messenger Platform API (Pages only; no personal profile publishing).
   - Required App Review permissions: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `pages_manage_engagement`, `pages_messaging`.
2. **Instagram**: Instagram Graph API (Business & Creator professional accounts).
   - Required permissions: `instagram_basic`, `instagram_content_publish`, `instagram_manage_comments`, `instagram_manage_messages`.
3. **TikTok**: Official TikTok Login Kit, Display API, Content Posting API, Business Messaging API (where approved).
   - Note: TikTok does not expose unrestricted historical posts, comments, or user blocking/banning via public APIs. Unsupported capabilities return structured `UNSUPPORTED` capability errors.

## Capability Registry
Every `SocialAccount` tracks capabilities (`SUPPORTED`, `UNSUPPORTED`, `REQUIRES_PERMISSION`, `REQUIRES_APPROVAL`, `ACCOUNT_INELIGIBLE`, `TEMPORARILY_UNAVAILABLE`) checked before any action.
