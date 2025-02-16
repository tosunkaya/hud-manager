import { useState, useEffect } from 'react';
import Section from '../Section';
import { Row, Col, FormGroup, Input, Button } from 'reactstrap';
import { ReactComponent as LiveIcon } from './../../../../../styles/icons/live.svg';
import { IContextData } from '../../../../Context';
import { useTranslation } from 'react-i18next';
import api from '../../../../../api/api';
import * as I from './../../../../../api/interfaces';
import moment from 'moment';
import { Orientation, Side } from 'csgogsi-socket';
import { VetoSides } from '../../../../../../types/interfaces';

interface Props {
	cxt: IContextData;
}

export const MatchHandler: {
	edit: (match: I.Match | null) => void;
	match: I.Match | null;
	handler: (match: I.Match | null) => void;
} = {
	handler: () => {},
	match: null,
	edit: (match: I.Match | null) => {
		if (match && MatchHandler.match && match.id === MatchHandler.match.id) {
			MatchHandler.match = null;
			MatchHandler.handler(null);
			return;
		}
		MatchHandler.match = match;
		MatchHandler.handler(match);
	}
};

const CurrentMatchForm = ({ cxt }: Props) => {
	const { t } = useTranslation();
	const [maps, setMaps] = useState<string[]>([]);

	const [match, setMatch] = useState<I.Match | null>(null);

	const updateMatch = async () => {
		if (!match) return;
		const form = { ...match };
		if (form.id.length) {
			await api.match.update(form.id, form);
			cxt.reload();
		}
	};

	const setTeamHandler = (side: Orientation, id: string, wins = 0) => {
		if (!match) return;
		match[side].id = id;
		match[side].wins = wins;
		setMatch({ ...match });
	};

	const setVetoType = (veto: I.Veto, type: I.VetoType) => {
		if (!match || match.game !== 'csgo') return;
		const newVetos = match.vetos.map(oldVeto => {
			if (veto !== oldVeto) return oldVeto;

			return { ...veto, type, teamId: type !== 'decider' ? (veto as I.CSGOVeto).teamId : '' } as I.CSGOVeto;
		});
		setMatch({ ...match, vetos: newVetos });
	};

	const setTeamForVeto = (index: number, teamId: string) => {
		if (!match || match.game !== 'csgo') return;
		match.vetos = match.vetos.map((veto, i) => {
			if (index !== i) return veto;
			return { ...veto, teamId: teamId !== veto.teamId && veto.type !== 'decider' ? teamId : '' };
		});
		setMatch({ ...match });
	};

	const setMap = (veto: I.Veto, map: string) => {
		if (!match || match.game !== 'csgo') return;
		const newVetos = match.vetos.map(oldVeto => {
			if (veto !== oldVeto) return oldVeto;

			return { ...veto, mapName: map } as I.CSGOVeto;
		});
		setMatch({ ...match, vetos: newVetos });
	};

	const swapTeams = () => {
		if (!match) return;
		[match.left.id, match.right.id] = [match.right.id, match.left.id];
		setMatch({ ...match });
	};

	const changeStartTime = (ev: any) => {
		if (!match) return;
		const val = ev.target.value;
		setMatch({ ...match, startTime: moment(val).valueOf() });
	};

	const setReversed = (veto: I.Veto, checked: boolean) => {
		if (!match) return;
		const newVetos = match.vetos.map(oldVeto => {
			if (veto !== oldVeto) return oldVeto;

			return { ...veto, reverseSide: checked };
		});
		match.vetos = newVetos;
		setMatch({ ...match });
	};

	const setSidePick = (veto: I.Veto, side: Side | 'NO') => {
		if (!match || match.game !== 'csgo' || !('side' in veto)) return;
		const newVetos = match.vetos.map(oldVeto => {
			if (veto !== oldVeto) return oldVeto;

			return { ...veto, side };
		});
		setMatch({ ...match, vetos: newVetos });
	};

	const setCurrent = async () => {
		if (!match) return;
		setMatch({ ...match, current: !match.current });
	};

	const getCSGOVeto = (veto: I.CSGOVeto, i: number) => (
		<div key={veto.mapName + veto.teamId + i} className="veto-list">
			<div className="team-picker-container">
				{teams.map((team, j) => (
					<div
						key={team._id + j + i}
						className={`picker-button ${veto.teamId === team._id ? 'active' : ''}`}
						onClick={() => setTeamForVeto(i, team._id)}
					>
						{team.logo ? <img src={team.logo} /> : null}
						{team.name}
					</div>
				))}
			</div>
			<div className="picker-container">
				<div
					className={`picker-button pick ${veto.type === 'pick' ? 'active' : ''}`}
					onClick={() => setVetoType(veto, 'pick')}
				>
					PICK
				</div>
				<div
					className={`picker-button ban ${veto.type === 'ban' ? 'active' : ''}`}
					onClick={() => setVetoType(veto, 'ban')}
				>
					BAN
				</div>
				<div
					className={`picker-button decider ${veto.type === 'decider' ? 'active' : ''}`}
					onClick={() => setVetoType(veto, 'decider')}
				>
					DECIDER
				</div>
			</div>
			<div className="side-picker">
				{(['CT', 'T', 'NO'] as VetoSides[]).map(side => (
					<div key={side} className="checkbox-container">
						<div
							className={`checkbox-el ${side === veto.side ? 'active' : ''}`}
							onClick={() => setSidePick(veto, side)}
						>
							{side === veto.side ? `✓` : null}
						</div>
						<div className="checkbox-label">{side}</div>
					</div>
				))}
			</div>
			<div className="map-picker-container">
				<Input
					type="select"
					name="maps"
					value={veto.mapName || undefined}
					onChange={e => setMap(veto, e.target.value)}
				>
					<option value="">{t('common.map')}</option>
					{maps.map(map => (
						<option key={map} value={map}>
							{map}
						</option>
					))}
				</Input>

				<div className="checkbox-container">
					<div
						className={`checkbox-el ${veto.reverseSide ? 'active' : ''}`}
						onClick={() => setReversed(veto, !veto.reverseSide)}
					>
						{veto.reverseSide ? `✓` : null}
					</div>
					<div className="checkbox-label">{t('match.reversedSides')}</div>
				</div>
			</div>
		</div>
	);

	const renderVeto = (match: I.Match) => {
		if (match.game === 'csgo') {
			return match.vetos.map((veto, i) => getCSGOVeto(veto, i));
		}
		return null;
	};

	useEffect(() => {
		api.match.getMaps().then(maps => {
			setMaps(maps);
		});
		MatchHandler.handler = setMatch;
	}, []);

	useEffect(() => {
		updateMatch();
	}, [match]);

	const teams: I.Team[] = [];

	if (match) {
		//for (const veto of match.vetos) {
		//const index = match.vetos.indexOf(veto);

		/*if (!veto.mapName) {
				match.vetos[index] = {
					teamId: '',
					mapName: '',
					side: 'NO',
					mapEnd: false,
					type: 'pick'
				};
			}*/
		//}

		if (match.left.id) {
			const leftTeam = cxt.teams.find(team => team._id === match.left.id);
			if (leftTeam) teams.push(leftTeam);
		}

		if (match.right.id) {
			const rightTeam = cxt.teams.find(team => team._id === match.right.id);
			if (rightTeam) teams.push(rightTeam);
		}
	}
	return (
		<Section
			title={
				<>
					Match
					{match ? (
						<div className={`match-edit-button`} onClick={setCurrent}>
							<LiveIcon className={`image-button ${match.current ? '' : 'transparent'}`} />
						</div>
					) : null}
				</>
			}
			cxt={cxt}
			width={698}
		>
			{match ? (
				<>
					<Row>
						<Col md="5">
							<FormGroup>
								<Input
									type="select"
									name="team"
									value={match.left.id || ''}
									onChange={e => setTeamHandler('left', e.target.value)}
								>
									<option value="">{t('common.team')}</option>
									{cxt.teams
										.concat()
										.sort((a, b) => (a.name < b.name ? -1 : 1))
										.map(team => (
											<option key={team._id + 'cg'} value={team._id}>
												{team.name}
											</option>
										))}
								</Input>
							</FormGroup>
						</Col>
						<Col md="2" className="swap-container">
							<Button className="swap-btn picker-button" onClick={swapTeams}>
								Swap
							</Button>
						</Col>
						<Col md="5">
							<FormGroup>
								<Input
									type="select"
									name="team"
									value={match.right.id || ''}
									onChange={e => setTeamHandler('right', e.target.value)}
								>
									<option value="">{t('common.team')}</option>
									{cxt.teams
										.concat()
										.sort((a, b) => (a.name < b.name ? -1 : 1))
										.map(team => (
											<option key={team._id + 'cg'} value={team._id}>
												{team.name}
											</option>
										))}
								</Input>
							</FormGroup>
						</Col>
					</Row>
					<Row>
						<Col md="12">
							<FormGroup>
								<Input
									type="datetime-local"
									value={
										match.startTime
											? moment(match.startTime).format(moment.HTML5_FMT.DATETIME_LOCAL)
											: ''
									}
									onChange={changeStartTime}
								/>
							</FormGroup>
						</Col>
					</Row>
					{teams.length !== 2 ? t('match.pickBothTeams') : renderVeto(match)}
				</>
			) : null}
		</Section>
	);
};

export default CurrentMatchForm;
