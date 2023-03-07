export default {
    userTags: function(tags){
        // Tags starting with a "_" are considered hidden or system tags
        // and should not be displayed to end users via the UI
        if (Array.isArray(tags)){
            return tags.filter(t => !t.startsWith("_"));
        }else return [];
    },

    systemTags: function(tags){
        // Tags starting with a "_" are considered hidden or system tags
        // and should not be displayed to end users via the UI
        if (Array.isArray(tags)){
            return tags.filter(t => t.startsWith("_"));
        }else return [];
    },

    combine: function(user, system){
        if (Array.isArray(user) && Array.isArray(system)){
            return user.concat(system);
        }else throw Error("Invalid parameters");
    }
}