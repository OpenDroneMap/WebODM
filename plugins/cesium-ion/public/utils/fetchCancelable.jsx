const makeCancelable = promise => {
    let hasCanceled_ = false;

    const wrappedPromise = new Promise((resolve, reject) => {
        promise.then(
            val => (hasCanceled_ ? reject({ isCanceled: true }) : resolve(val)),
            error =>
                hasCanceled_ ? reject({ isCanceled: true }) : reject(error)
        );
    });

    return {
        promise: wrappedPromise,
        cancel() {
            hasCanceled_ = true;
        }
    };
};

export { makeCancelable };

const fetchCancelable = (...args) => makeCancelable(fetch(...args));

export default fetchCancelable;
