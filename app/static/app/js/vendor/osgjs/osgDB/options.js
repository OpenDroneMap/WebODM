'use strict';
var defaultOptions = {

    // prefix to built url to load resource
    prefixURL: '',

    // database URL for PagedLOD structures
    databasePath: '',

    // callback used when loading data
    progressXHRCallback: undefined,

    // replacement of readImageURL to use your own code to load Nodes
    // the function will be execute in the context of Input, see Input:readNodeURL
    readNodeURL: undefined,

    // replacement of readImageURL to use your own code to load osg.Image
    // the function will be execute in the context of Input, see Input:readImageURL
    readImageURL: undefined,

    // replacement of readBinaryArrayURL to use your own code to load binary array
    // the function will be execute in the context of Input, see Input:readBinaryArrayURL
    readBinaryArrayURL: undefined,

    imageLoadingUsePromise: true, // use promise to load image instead of returning Image
    imageOnload: undefined, // use callback when loading an image
    imageCrossOrigin: undefined // use callback when loading an image
};

module.exports = defaultOptions;
