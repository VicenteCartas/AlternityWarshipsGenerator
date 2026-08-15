import { useState, type ReactNode } from 'react';
import {
  Alert, Box, Chip, Divider, Paper, Stack, Tab, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Tabs, Typography,
} from '@mui/material';
import { scrollableTableContainerSx } from '@shared/constants/tableStyles';
import { buildCharacterSheetModel } from '../services/characterSheetService';
import type { CharacterState, CharacterValidationResult } from '../types/characterState';

interface CharacterSummaryProps {
  state: CharacterState;
  validation: CharacterValidationResult;
}

type SummaryTab = 'overview' | 'skills' | 'fx' | 'combat' | 'gear' | 'advancement' | 'options';

function Value({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{label}</Typography>
      <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>{value === '' || value === null || value === undefined ? '-' : value}</Typography>
    </Box>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <Box><Typography variant="h6" sx={{ mb: 1 }}>{title}</Typography>{children}</Box>;
}

function EmptyRow({ columns }: { columns: number }) {
  return <TableRow><TableCell colSpan={columns} align="center" sx={{ color: 'text.secondary' }}>None</TableCell></TableRow>;
}

export function CharacterSummary({ state, validation }: CharacterSummaryProps) {
  const [tab, setTab] = useState<SummaryTab>('overview');
  const model = buildCharacterSheetModel(state, validation);

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h4">{model.heroName}</Typography>
          <Typography color="text.secondary">
            Level {model.level} {model.species} {model.profession} | {model.career || 'No career'} | PL {model.progressLevel}
          </Typography>
        </Box>
        <Chip label={model.valid ? 'Creation complete' : `${model.errors.length} issues`} color={model.valid ? 'success' : 'warning'} />
      </Stack>
      {!model.valid && <Alert severity="warning">{model.errors.slice(0, 8).join(' ')}</Alert>}

      <Tabs value={tab} onChange={(_event, value: SummaryTab) => setTab(value)} variant="scrollable" scrollButtons="auto">
        <Tab value="overview" label="Overview" />
        <Tab value="skills" label="Skills" />
        {model.fxBroadSkill && <Tab value="fx" label="FX" />}
        <Tab value="combat" label="Combat" />
        <Tab value="gear" label="Gear" />
        <Tab value="advancement" label="Advancement" />
        <Tab value="options" label="Options & Notes" />
      </Tabs>
      <Divider />

      {tab === 'overview' && (
        <Stack spacing={3}>
          <Section title="Hero">
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2 }}>
              <Value label="Player" value={model.playerName} /><Value label="Setting" value={model.setting} />
              <Value label="Gamemaster" value={model.gamemaster} /><Value label="Attributes" value={model.attributes} />
              <Value label="Gender" value={model.gender} /><Value label="Age" value={model.age} />
              <Value label="Height / Weight" value={model.height || model.weight ? `${model.height || '-'} / ${model.weight || '-'}` : ''} />
              <Value label="Hair / Eyes" value={model.hair || model.eyes ? `${model.hair || '-'} / ${model.eyes || '-'}` : ''} />
              <Value label="Allegiance" value={model.allegiance} /><Value label="Social Status" value={model.socialStatus} />
              <Value label="Appearance" value={model.appearance} />
              <Value label="Motivation" value={model.motivation} /><Value label="Moral Attitude" value={model.moralAttitude} />
              <Value label="Traits" value={model.characterTraits.join(', ')} /><Value label="Background" value={model.background} />
            </Box>
          </Section>
          <Section title="Abilities">
            <TableContainer sx={scrollableTableContainerSx}><Table size="small">
              <TableHead><TableRow><TableCell>Ability</TableCell><TableCell>Score</TableCell><TableCell>Untrained</TableCell><TableCell>Resistance</TableCell></TableRow></TableHead>
              <TableBody>{model.abilities.map((ability) => <TableRow key={ability.id}>
                <TableCell>{ability.label}</TableCell><TableCell>{ability.score}</TableCell><TableCell>{ability.untrained}</TableCell>
                <TableCell>{ability.resistance === null ? '-' : `${ability.resistance >= 0 ? '+' : ''}${ability.resistance}`}</TableCell>
              </TableRow>)}</TableBody>
            </Table></TableContainer>
          </Section>
          <Section title="Core Values">
            <Stack direction="row" gap={1} flexWrap="wrap">
              <Chip label={`Action ${model.actionCheck.marginal}/${model.actionCheck.ordinary}/${model.actionCheck.good}/${model.actionCheck.amazing}`} color="primary" variant="outlined" />
              <Chip label={`${model.actionsPerRound} actions`} variant="outlined" />
              <Chip label={`Last Resorts ${model.lastResorts.initial}/${model.lastResorts.maximum}`} variant="outlined" />
              <Chip label={`${model.achievementPoints} Achievement Points`} variant="outlined" />
              <Chip label={`Stun ${model.durability.stun}`} variant="outlined" /><Chip label={`Wound ${model.durability.wound}`} variant="outlined" />
              <Chip label={`Mortal ${model.durability.mortal}`} variant="outlined" /><Chip label={`Fatigue ${model.durability.fatigue}`} variant="outlined" />
            </Stack>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mt: 2 }}>
              <Value label="Sprint / Run / Walk" value={`${model.movement.sprint} / ${model.movement.run} / ${model.movement.walk}`} />
              <Value label="Easy Swim / Swim" value={`${model.movement.easySwim} / ${model.movement.swim}`} />
              <Value label="Glide / Fly" value={`${model.movement.glide} / ${model.movement.fly}`} />
              <Value label="Skill Points" value={`${model.remainingSkillPoints} remaining of ${model.availableSkillPoints}`} />
              <Value label="Strength Damage" value={`${model.strengthDamageAdjustment >= 0 ? '+' : ''}${model.strengthDamageAdjustment}`} />
              <Value label="Last Resort Cost" value={model.lastResorts.cost === null ? '-' : `${model.lastResorts.cost} points`} />
            </Box>
          </Section>
        </Stack>
      )}

      {tab === 'skills' && (
        <Stack spacing={2}>
          <Stack direction="row" gap={1} flexWrap="wrap">
            <Chip label={`Native: ${validation.skills.nativeLanguage || 'Not selected'} (rank ${model.skills.find((skill) => skill.source === 'Native')?.rank || 3})`} color="primary" variant="outlined" />
            <Chip label={`${model.spentSkillPoints} spent`} variant="outlined" />
            <Chip label={`${model.remainingSkillPoints} remaining`} color={model.remainingSkillPoints >= 0 ? 'success' : 'error'} variant="outlined" />
            {model.skillRuleLabels.map((label) => <Chip key={label} label={label} variant="outlined" />)}
          </Stack>
          <TableContainer sx={scrollableTableContainerSx}><Table size="small">
            <TableHead><TableRow><TableCell>Ability</TableCell><TableCell>Skill</TableCell><TableCell>Rank</TableCell><TableCell>O / G / A</TableCell><TableCell>Source</TableCell></TableRow></TableHead>
            <TableBody>{model.skills.map((skill, index) => <TableRow key={`${skill.name}-${index}`}>
              <TableCell>{skill.ability.toUpperCase()}</TableCell><TableCell>{skill.name}</TableCell><TableCell>{skill.rank ?? '-'}</TableCell>
              <TableCell>{skill.ordinary} / {skill.good} / {skill.amazing}</TableCell><TableCell>{skill.source}</TableCell>
            </TableRow>)}</TableBody>
          </Table></TableContainer>
        </Stack>
      )}

      {tab === 'fx' && model.fxBroadSkill && (
        <Stack spacing={2}>
          <Stack direction="row" gap={1} flexWrap="wrap">
            <Chip label={model.fxBroadSkill} color="primary" variant="outlined" />
            <Chip label={`${model.fxCampaignTone} campaign`} variant="outlined" />
            <Chip label={`${model.currentMaximumFxEnergy}/${model.maximumFxEnergy} FX energy`} color="success" variant="outlined" />
          </Stack>
          <TableContainer sx={scrollableTableContainerSx}><Table size="small">
            <TableHead><TableRow><TableCell>Ability</TableCell><TableCell>Specialty</TableCell><TableCell>Type</TableCell><TableCell>Quality</TableCell><TableCell>Rank</TableCell><TableCell>O / G / A</TableCell><TableCell>Energy</TableCell><TableCell>Effect</TableCell></TableRow></TableHead>
            <TableBody>{model.fxAbilities.length > 0 ? model.fxAbilities.map((ability) => <TableRow key={`${ability.discipline}-${ability.name}`}>
              <TableCell>{ability.ability.toUpperCase()}</TableCell><TableCell>{ability.name}</TableCell><TableCell>{ability.category}</TableCell>
              <TableCell>{ability.quality}</TableCell><TableCell>{ability.rank}</TableCell><TableCell>{ability.ordinary} / {ability.good} / {ability.amazing}</TableCell>
              <TableCell>{ability.energyCost}</TableCell><TableCell>{ability.description}</TableCell>
            </TableRow>) : <EmptyRow columns={8} />}</TableBody>
          </Table></TableContainer>
        </Stack>
      )}

      {tab === 'combat' && (
        <Stack spacing={3}>
          <Section title="Attacks"><TableContainer sx={scrollableTableContainerSx}><Table size="small">
            <TableHead><TableRow><TableCell>Attack</TableCell><TableCell>Skill</TableCell><TableCell>Score</TableCell><TableCell>Qty</TableCell><TableCell>Clips</TableCell><TableCell>Acc</TableCell><TableCell>Actions</TableCell><TableCell>Mode</TableCell><TableCell>Range</TableCell><TableCell>Type</TableCell><TableCell>Damage</TableCell></TableRow></TableHead>
            <TableBody>{model.attacks.map((attack, index) => <TableRow key={`${attack.name}-${index}`}>
              <TableCell>{attack.name}</TableCell><TableCell>{attack.skill}</TableCell>
              <TableCell>{attack.score ? `${attack.score.ordinary}/${attack.score.good}/${attack.score.amazing}` : '-'}</TableCell>
              <TableCell>{attack.quantity}</TableCell><TableCell>{attack.clips}</TableCell>
              <TableCell>{attack.accuracy}</TableCell><TableCell>{attack.actions}</TableCell><TableCell>{attack.mode}</TableCell><TableCell>{attack.range}</TableCell><TableCell>{attack.damageType}</TableCell><TableCell>{attack.damage}</TableCell>
            </TableRow>)}</TableBody>
          </Table></TableContainer></Section>
          <Section title="Armor"><TableContainer sx={scrollableTableContainerSx}><Table size="small">
            <TableHead><TableRow><TableCell>Armor</TableCell><TableCell>Qty</TableCell><TableCell>AP</TableCell><TableCell>LI / HI / En</TableCell><TableCell>Mass</TableCell></TableRow></TableHead>
            <TableBody>{model.armor.length > 0 ? model.armor.map((armor, index) => <TableRow key={`${armor.name}-${index}`}>
              <TableCell>{armor.name}</TableCell><TableCell>{armor.quantity}</TableCell><TableCell>+{armor.actionCheckPenalty}</TableCell>
              <TableCell>{armor.lowImpact} / {armor.highImpact} / {armor.energy}</TableCell><TableCell>{armor.mass} kg</TableCell>
            </TableRow>) : <EmptyRow columns={5} />}</TableBody>
          </Table></TableContainer></Section>
        </Stack>
      )}

      {tab === 'gear' && (
        <Stack spacing={3}>
          <Stack direction="row" gap={1} flexWrap="wrap">
            <Chip label={`${model.startingFunds} starting credits`} color="primary" variant="outlined" />
            <Chip label={`${model.remainingFunds} remaining`} color={model.remainingFunds >= 0 ? 'success' : 'error'} variant="outlined" />
            <Chip label={`${model.totalCarriedMass} kg carried`} variant="outlined" />
            <Chip label={`Cyber tolerance ${model.usedCyberTolerance}/${model.cyberTolerance}`} variant="outlined" />
          </Stack>
          {([['Equipment', model.equipment], ['Computers', model.computers], ['Cybergear', model.cybergear]] as const).map(([title, items]) => (
            <Section title={title} key={title}><TableContainer sx={scrollableTableContainerSx}><Table size="small">
              <TableHead><TableRow><TableCell>Item</TableCell><TableCell>Qty</TableCell><TableCell>Details</TableCell><TableCell>Mass</TableCell></TableRow></TableHead>
              <TableBody>{items.length > 0 ? items.map((item, index) => <TableRow key={`${item.name}-${index}`}>
                <TableCell>{item.name}</TableCell><TableCell>{item.quantity}</TableCell><TableCell>{item.details || '-'}</TableCell><TableCell>{item.mass} kg</TableCell>
              </TableRow>) : <EmptyRow columns={4} />}</TableBody>
            </Table></TableContainer></Section>
          ))}
        </Stack>
      )}

      {tab === 'advancement' && (
        <Stack spacing={2}>
          <Stack direction="row" gap={1} flexWrap="wrap">
            <Chip label={`Current level ${model.level}`} color="primary" variant="outlined" />
            <Chip label={`${model.achievementPoints} Achievement Points`} variant="outlined" />
            <Chip label={`${model.remainingSkillPoints} stored skill points`} variant="outlined" />
          </Stack>
          {model.advancementLevels.length === 0 ? (
            <Typography color="text.secondary">No advancement beyond level 1.</Typography>
          ) : model.advancementLevels.map((level) => (
            <Paper key={level.level} variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={1}>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={1}>
                  <Typography variant="h6">Level {level.level}</Typography>
                  <Stack direction="row" gap={1} flexWrap="wrap">
                    <Chip size="small" label={`+${level.skillPointsEarned} SP`} variant="outlined" />
                    <Chip size="small" label={`${level.skillPointsSpent} spent`} variant="outlined" />
                    <Chip size="small" label={`${level.skillPointsRemaining} stored`} variant="outlined" />
                    <Chip size="small" label={`${level.creditsRemaining} credits`} variant="outlined" />
                  </Stack>
                </Stack>
                {level.purchases.length > 0
                  ? <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2.5 }}>{level.purchases.map((purchase, index) => <Typography component="li" variant="body2" key={`${purchase}-${index}`}>{purchase}</Typography>)}</Stack>
                  : <Typography variant="body2" color="text.secondary">No purchases; points carried forward.</Typography>}
                {level.notes && <Typography variant="body2">{level.notes}</Typography>}
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      {tab === 'options' && (
        <Stack spacing={3}>
          <Section title="Species Abilities">
            {model.speciesAbilities.length > 0
              ? <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2.5 }}>{model.speciesAbilities.map((summary) => <Typography component="li" variant="body2" key={summary}>{summary}</Typography>)}</Stack>
              : <Typography color="text.secondary">None</Typography>}
          </Section>
          <Section title="Profession Benefits">
            {model.professionBenefits.length > 0
              ? <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2.5 }}>{model.professionBenefits.map((summary) => <Typography component="li" variant="body2" key={summary}>{summary}</Typography>)}</Stack>
              : <Typography color="text.secondary">None</Typography>}
          </Section>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' }, gap: 3 }}>
            {([['Perks', model.perks], ['Flaws', model.flaws], ['Mutations', model.mutations]] as const).map(([title, entries]) => (
              <Section title={title} key={title}>{entries.length > 0
                ? <Stack spacing={1}>{entries.map((entry, index) => <Value key={`${entry.name}-${index}`} label={entry.name} value={entry.details} />)}</Stack>
                : <Typography color="text.secondary">None</Typography>}</Section>
            ))}
            <Section title="Psionics">
              <Typography variant="body2" sx={{ mb: 1 }}>Access: {model.psionicAccessPath} | Energy: {model.psionicEnergy}</Typography>
              {model.psionicSkills.length > 0
                ? <Stack spacing={1}>{model.psionicSkills.map((skill, index) => <Value key={`${skill.name}-${index}`} label={skill.rank === null ? `${skill.name} (broad)` : `${skill.name} (rank ${skill.rank})`} value={`${skill.ordinary}/${skill.good}/${skill.amazing}`} />)}</Stack>
                : <Typography color="text.secondary">None</Typography>}
            </Section>
          </Box>
          <Divider />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
            <Value label="Contacts" value={model.contacts} /><Value label="Enemies" value={model.enemies} />
            <Value label="Background" value={model.background} /><Value label="Notes" value={model.notes} />
          </Box>
        </Stack>
      )}
    </Stack>
  );
}