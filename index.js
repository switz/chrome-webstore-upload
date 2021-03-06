const got = require('got');

const rootURI = 'https://www.googleapis.com';
const refreshTokenURI = 'https://www.googleapis.com/oauth2/v4/token';
const uploadNewURI = `${rootURI}/upload/chromewebstore/v1.1/items`;
const uploadExistingURI = id => `${rootURI}/upload/chromewebstore/v1.1/items/${id}`;
const publishURI = (id, target) => (
    `${rootURI}/chromewebstore/v1.1/items/${id}/publish?publishTarget=${target}`
);

const requiredFields = [
    'clientId',
    'clientSecret',
    'refreshToken'
];

class APIClient {
    constructor(opts) {
        requiredFields.forEach(field => {
            if (!opts[field]) {
                throw new Error(`Option "${field}" is required`);
            }

            this[field] = opts[field];
            this.extensionId = opts.extensionId;
        });
    }

    uploadNew(readStream, token) {
        if (!readStream) {
            return Promise.reject(new Error('Read stream missing'));
        }

        const eventualToken = token ? Promise.resolve(token) : this.fetchToken();

        return eventualToken.then(token => {
            return got.post(uploadNewURI, {
                headers: this._headers(token),
                body: readStream,
                json: true
            }).then(this._extractBody);
        });
    }

    uploadExisting(readStream, token) {
        if (!readStream) {
            return Promise.reject(new Error('Read stream missing'));
        }

        const { extensionId } = this;

        if (!extensionId) throw new Error('Option "extensionId" is required to call uploadExisting');

        const eventualToken = token ? Promise.resolve(token) : this.fetchToken();

        return eventualToken.then(token => {
            return got.put(uploadExistingURI(extensionId), {
                headers: this._headers(token),
                body: readStream,
                json: true
            }).then(this._extractBody);
        });
    }

    publish(target = 'default', token) {
        const { extensionId } = this;

        if (!extensionId) throw new Error('Option "extensionId" is required to call publish');

        const eventualToken = token ? Promise.resolve(token) : this.fetchToken();

        return eventualToken.then(token => {
            return got.post(publishURI(extensionId, target), {
                headers: this._headers(token),
                json: true
            }).then(this._extractBody);
        });
    }

    fetchToken() {
        const { clientId, clientSecret, refreshToken } = this;

        return got.post(refreshTokenURI, {
            body: {
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: refreshToken,
                grant_type: 'refresh_token'
            },
            json: true
        }).then(this._extractBody).then(({ access_token }) => access_token);
    }

    _headers(token) {
        return {
            Authorization: `Bearer ${token}`,
            'x-goog-api-version': '2'
        };
    }

    _extractBody({ body }) {
        return body;
    }
}


module.exports = function(...args) {
    return new APIClient(...args);
};
