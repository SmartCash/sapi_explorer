import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import random from 'random';
import { Observable } from 'rxjs';
import { DefaultProvider } from '../../providers/default/default';

import * as _ from 'lodash';

export interface ChainNetwork {
    chain: string;
    network: string;
}
export interface NetworkSettings {
    availableNetworks: ChainNetwork[];
    selectedNetwork: ChainNetwork;
}

const CurrentEnv = process.env.ENV || 'dev';

const EnvApiHosts: { [env: string]: { [chain: string]: string } } = {
    prod: {
        default: 'https://api.bitcore.io/api',
        ETH: 'https://api-eth.bitcore.io/api'
    },
    dev: { default: '/api' }
};

const CurrentApiHosts = EnvApiHosts[CurrentEnv];

@Injectable()
export class ApiProvider {
    public defaultNetwork = {
        chain: this.defaults.getDefault('%CHAIN%'),
        network: this.defaults.getDefault('%NETWORK%')
    };
    public networkSettings = {
        availableNetworks: [this.defaultNetwork],
        selectedNetwork: this.defaultNetwork,
        chainNetworkLookup: {}
    };

    public ratesAPI = {
        btc: 'https://bitpay.com/api/rates',
        bch: 'https://bitpay.com/api/rates/bch',
        eth: 'https://bitpay.com/api/rates/eth'
    };

    public bwsUrl = {
        urlPrefix: 'https://bws.bitpay.com/bws/api/v1/fiatrates/'
    };

    constructor(
        public httpClient: HttpClient,
        private defaults: DefaultProvider
    ) {

    }

    public getAvailableNetworks(): Observable<
        Array<{ host: string; supported: ChainNetwork[] }>
    > {
        const hosts = CurrentApiHosts;
        return Observable.fromPromise(
            Promise.all(
                Object.keys(hosts).map(async chain => {
                    const host = hosts[chain];
                    const supported = await this.httpClient
                        .get<ChainNetwork[]>(host + '/status/enabled-chains')
                        .toPromise();
                    return {
                        host,
                        supported
                    };
                })
            )
        );
    }

    getHostForChain(chain: string) {
        return CurrentApiHosts[chain] || CurrentApiHosts.default;
    }

    public getUrlPrefix(chain, network): string {
        const defaultChain = chain || this.defaultNetwork.chain;
        const defaultNetwork = network || this.defaultNetwork.network;
        const key = `${defaultChain}:${defaultNetwork}`;
        const lookupHost = this.networkSettings.chainNetworkLookup[key];
        const prefix = lookupHost || this.getHostForChain(chain);
        return prefix;
    }

    public getRandomSapiUrl() {
        const sapis = [
            `seed2.smarts.cash:8080`,
            `seed1.smarts.cash:8080`,
            `seed.smarts.cash:8080`,
        ];
        if (window.location.protocol === 'http:') {
            let electedSapi = sapis[random.int(0, sapis.length - 1)];
            let prefix = `http://${electedSapi}/v1/`;
            return prefix;
        }
        return `https://sapi.smartcash.cc/v1/`;
    }

    public getUrl(params?: { chain?: string; network?: string }): string {
        let { chain, network } = params;
        chain = chain || this.networkSettings.selectedNetwork.chain;
        network = network || this.networkSettings.selectedNetwork.network;
        const prefix: string = this.getUrlPrefix(chain, network);
        const apiPrefix = `${prefix}/${chain}/${network}`;
        return apiPrefix;
    }

    public getConfig(): ChainNetwork {
        const config = {
            chain: this.networkSettings.selectedNetwork.chain,
            network: this.networkSettings.selectedNetwork.network
        };
        return config;
    }

    public changeNetwork(network: ChainNetwork): void {
        const availableNetworks = this.networkSettings.availableNetworks;
        // Can't do the following because availableNetworks is loaded
        /*
         *const isValid = _.some(availableNetworks, network);
         *if (!isValid) {
         *  this.logger.error(
         *    'Invalid URL: missing or invalid COIN or NETWORK param'
         *  );
         *  return;
         *}
         */
        this.networkSettings = {
            availableNetworks,
            selectedNetwork: network,
            chainNetworkLookup: this.networkSettings.chainNetworkLookup || {}
        };
    }
}
