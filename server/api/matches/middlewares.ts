import express, { RequestHandler } from 'express';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import * as M from './index';
import { ioPromise } from '../../socket';
import { customer, validateCloudAbility } from '..';
import { AvailableGames } from '../../../types/interfaces';
import { addResource, checkCloudStatus, deleteResource, updateLastDateLocallyOnly, updateResource } from '../cloud';
import { bindMatch } from '../tournaments';

export const getMatchesRoute: express.RequestHandler = async (req, res) => {
	const game = customer.game;
	const $or: any[] = [{ game }];
	if (game === 'csgo') {
		$or.push({ game: { $exists: false } });
	}
	const matches = (await M.getMatches({ $or })).map(match => {
		if ('full' in req.query) return match;
		return {
			...match,
			vetos: match.vetos.map(veto => ({ ...veto, game: undefined }))
		};
	});
	return res.json(matches);
};

export const getMatchRoute: express.RequestHandler = async (req, res) => {
	if (!req.params.id) {
		return res.sendStatus(422);
	}
	const match = await M.getMatchById(req.params.id);

	if (!match) {
		return res.sendStatus(404);
	}

	return res.json(match);
};

export const addMatchRoute: RequestHandler = async (req, res) => {
	req.body.game = customer.game;
	const { matchupId, tournamentId, ...data } = req.body;
	const match = await M.addMatch(data);

	let cloudStatus = false;
	if (await validateCloudAbility('matches')) {
		cloudStatus = (await checkCloudStatus(customer.game as AvailableGames)) === 'ALL_SYNCED';
	}

	if (matchupId && tournamentId && match) {
		const tournament = await bindMatch(match.id, matchupId, tournamentId);

		if (tournament && cloudStatus) {
			await updateResource(customer.game as AvailableGames, 'tournaments', tournament);
		}
	}

	if (match && cloudStatus) {
		await addResource(customer.game as AvailableGames, 'matches', match);
	} else if (match) {
		updateLastDateLocallyOnly(customer.game, ['matches']);
	}
	return res.sendStatus(match ? 200 : 500);
};

export const getCurrentMatchRoute: RequestHandler = async (req, res) => {
	const match = await M.getCurrent();

	if (!match) {
		return res.sendStatus(404);
	}

	return res.json(match);
};

export const deleteMatchRoute: RequestHandler = async (req, res) => {
	let cloudStatus = false;
	if (await validateCloudAbility('matches')) {
		cloudStatus = (await checkCloudStatus(customer.game as AvailableGames)) === 'ALL_SYNCED';
	}
	const match = await M.deleteMatch(req.params.id);
	if (cloudStatus && match) {
		await deleteResource(customer.game as AvailableGames, 'matches', req.params.id);
	} else if (match) {
		updateLastDateLocallyOnly(customer.game, ['matches']);
	}
	return res.sendStatus(match ? 200 : 500);
};

export const updateMatchRoute: RequestHandler = async (req, res) => {
	const io = await ioPromise;
	req.body.game = customer.game;

	let cloudStatus = false;
	if (await validateCloudAbility('matches')) {
		cloudStatus = (await checkCloudStatus(customer.game as AvailableGames)) === 'ALL_SYNCED';
	}
	const match = await M.updateMatch(req.body);
	if (cloudStatus && match) {
		await updateResource(customer.game as AvailableGames, 'matches', { ...req.body });
	} else if (match) {
		updateLastDateLocallyOnly(customer.game, ['matches']);
	}
	io.emit('match');
	return res.sendStatus(match ? 200 : 500);
};

export const getMaps: express.RequestHandler = (req, res) => {
	const defaultMaps = [
		'de_mirage',
		'de_dust2',
		'de_inferno',
		'de_nuke',
		'de_train',
		'de_overpass',
		'de_vertigo',
		'de_ancient',
		'de_cache'
	];
	const mapFilePath = path.join(app.getPath('userData'), 'maps.json');
	try {
		const maps = JSON.parse(fs.readFileSync(mapFilePath, 'utf8'));
		if (Array.isArray(maps)) {
			for (const defaultMap of defaultMaps) {
				if (!maps.includes(defaultMap)) {
					maps.push(defaultMap);
				}
			}
			return res.json(maps);
		}
		return res.json(defaultMaps);
	} catch {
		return res.json(defaultMaps);
	}
};
