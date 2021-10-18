const key = '43fbb025d37e4979a337c9bc088787b7';
const loc = 'https://kenaliwajah.cognitiveservices.azure.com';
export const facelist_id = 'class-1-facelist';

export const base_instance_options = {
    baseURL: `${loc}/face/v1.0`,
    timeout: 100000,
    headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': key
    }
};
