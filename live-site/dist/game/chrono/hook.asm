; Original observer source for chrono.js makeHook(). No assembler is required
; by the build; this file documents the generated machine code.
; Input: original Audio_StartSong entry at C70A39, native 65816 mode.
; Original game routine has already validated the song number and selected
; a real load command, including aliases expanded by Audio_CmdSongAlias.
org $C5F370
    php
    rep #$20
    pha
    sep #$20
    lda.l $7E1E01
    sta.l $7E1EE0
    lda.l $7E1E00
    sta.l $7E1EE2
    lda.l $7E1E02
    sta.l $7E1EE3
    lda #$43
    sta.l $7E1EEC
    lda #$57
    sta.l $7E1EED
    lda.l $7E1EE1
    inc a
    sta.l $7E1EE1
    rep #$20
    pla
    plp
    ; Original displaced five bytes, preserving their stack/width effects:
    php
    rep #$20
    lda $01
    jml $C70A3E
