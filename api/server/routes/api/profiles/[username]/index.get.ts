import HttpException from "~/models/http-exception.model";
import toProfile from "~/utils/profile.utils";
import {definePrivateEventHandler} from "~/auth-event-handler";

export default definePrivateEventHandler(async (event, {auth}) => {
    const username = getRouterParam(event, 'username');

    const profile = await usePrisma().user.findUnique({
        where: {
            username,
        },
        include: {
            followedBy: true,
        },
    });

    if (!profile) {
        throw new HttpException(404, {errors: {profile: ['not found']}});
    }

    return {profile: toProfile(profile, auth?.id)};
}, {requireAuth: false});
