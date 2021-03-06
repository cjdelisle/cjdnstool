# Cjdnstool

[![Build Status](https://travis-ci.org/cjdelisle/cjdnstool.svg?branch=master)](https://travis-ci.org/cjdelisle/cjdnstool)

Diagnostic and management tools for cjdns

## Install
(you might also want to install [cjdns](https://github.com/cjdelisle/cjdns.git))

```bash
npm install -g cjdnstool
```

## Use

```
$ cjdnstool
Usage: cjdnstool COMMAND OPTIONS
cjdnstool ping [OPTIONS] <nodename|ipv6|hostname>
    -k, --keyping                 # send switch ping requesting the key
    -s, --switchping              # send switch ping (requires -k)
    -d <data>, --data=<data>      # send extra data in the ping message
    -c <num>, --count=<num>       # number of pings to send before stopping
    -v, --verbose                 # print debug information
    -i <secs>, --waittime=<secs>  # number of seconds between messages
    -p <pref>, --pref=<pref>      # use specified address resolution preference

cjdnstool query COMMAND
    getpeers [OPTIONS] <nodename|ipv6|hostname>
        -2                        # request from the subnode pathfinder
        -v, --verbose             # print debug information
        -p <pref>, --pref=<pref>  # use specified address resolution preference

cjdnstool peer COMMAND
    show (default command)
        -6, --ip6                 # print ipv6 of peers rather than pubkeys

cjdnstool session [COMMAND]
    show (default command)
        -6, --ip6                 # print ipv6 of sessions rather than pubkeys

cjdnstool util COMMAND
    key2ip6 <pubkey>[ <pubkey>][ <pubkey>][...]
    priv2pub <privkey>[ <privkey>][ <privkey>][...]
    keygen

cjdnstool mon COMMAND
    pf                            # monitor pathfinder traffic
    ctrl                          # monitor switch control traffic
    snode                         # monitor traffic to/from the snode

cjdnstool resolve OPTIONS <hostname|ipv6>
    -v, --verbose                 # print debug information
    -p <pref>, --pref=<pref>      # use specified address resolution preference

cjdnstool cexec [COMMAND ARGS...]
                                  # run `cjdnstool cexec` for all commands
                                  # below are a couple of examples
    Allocator_bytesAllocated      # Determine how many bytes are allocated
    Core_pid                      # Get the cjdns core pid number
    ReachabilityCollector_getPeerInfo
        --page=<Int>              # Get information about your peers (paginated)
    SupernodeHunter_status        # Get a status report from the snode hunter
    see: https://github.com/cjdelisle/cjdns/blob/crashey/doc/admin-api.md#funcs

cjdnstool log [OPTIONS]
    -v <verb>, --verbosity=<verb> # specify the verbosity level of logging
                                  # one of DEBUG, INFO, WARN, ERROR, CRITICAL
                                  # each level implies the levels above it
                                  # INFO will include WARN, ERROR and CRITICAL
    -f <file>, --file=<file>      # limit logging to one file
    -l <line>, --line=<line>      # limit logging to a specific line number

cjdnstool snode COMMAND
    show (default command)        # display the currently used supernode, if any
    ls                            # list all configured snodes

cjdnstool passwd COMMAND
    show (default command)        # show names of configured peering passwords

cjdnstool iptun COMMAND
    show (default command)        # show all incoming and outgoing
                                  # iptun connections

cjdnstool iface COMMAND
    show (default command)        # show all configured interfaces

cjdnstool traceroute [OPTIONS] <nodename|ipv6|hostname>
    -2                            # request from the subnode pathfinder
    -v, --verbose                 # print debug information
    -p <pref>, --pref=<pref>      # use specified address resolution preference

cjdnstool conf [-f <f>] [--file=<f>] COMMAND
    -f <f>, --file=<f>            # use file <f>, default: /etc/cjdroute.conf
    migrate [-y]                  # convert v1 config format to v2
        -y                        # answer yes to all questions
        -d, --dryrun              # dry-run, print a unified diff of what
                                  # WOULD be changed
    put [OPTIONS] <path> <val>    # add/update an entry in a v2 config
        -d, --dryrun              # dry-run, print a unified diff of what
                                  # WOULD be changed
    get <path>                    # retreive an entry in a v1 or v2 config
```

### cjdnstool ping

cjdnstool ping allows you to send pathfinder pings and switch pings.
Unlike ICMP pings, both pathfinder pings and switch pings will be routed back according
the the same path which they took (this is critical to  the pathfinder that it's probe
messages come back on the same path so these pings do as well).

If you send a pathfinder ping and it comes back, you know that the CryptoAuth session is
working well and that your path to the other node is ok. However, it does not tell you
whether the other node's path back to you is working.

If a pathfinder ping fails to return, you can use a switch ping `-s` to check whether anything
is at the end of the path or if it is a dead path. If you request a key ping `-k` then
it the node at the end of the path will tell you it's key which will help you determine
whether it is the node which you (or your cjdns instance) think is at the end of the path.

#### Options

* `-s`, `--switchping`: Send a switch CTRL ping message rather than a pathfinder query
* `-k`, `--keyping`: If the message is a switch ping, send a request for the other party's
public key.
* `-d <data>`, `--data=<data>`: Send specific content in the message
* `-c <num>`, `--count=<num>`: Send this many probes and then exit
* `-v`, `--verbose`: Print additional debugging information
* `-i <secs>`, `--waittime=<secs>`: Wait this many seconds between sending messages
(can be decimal)
* `-p <pref>`, `--pref=<pref>`: Use the specified resolution preference, for example
`session,snode,pf` (the default) will try first to use what is in the session manager,
then it will try querying the supernode, then it will try the old pathfinder. If you
specify only 1 or 2 of the 3 options, the other option(s) will be skipped which may result
in a failure to resolve the domain.

#### Example

```
$ cjdnstool ping irc.fc00.io
pathfinder ping v20.0000.0000.0027.82a3.fdud7rqg7puz4hf6u4kztfku0pbujw88l29s4ugwhf61vgqv6cj0.k (resolved from [session])
1518729009 v20.0000.0000.0027.82a3.fdud7rqg7puz4hf6u4kztfku0pbujw88l29s4ugwhf61vgqv6cj0.k seq=0 time=150ms
1518729010 v20.0000.0000.0027.82a3.fdud7rqg7puz4hf6u4kztfku0pbujw88l29s4ugwhf61vgqv6cj0.k seq=1 time=149ms
^C
$ cjdnstool ping irc.fc00.io -s
ctrl PING 0000.0000.0027.82a3 (resolved from [session])
1518729017 0000.0000.0027.82a3 v=20 seq=0 time=148ms
1518729018 0000.0000.0027.82a3 v=20 seq=1 time=147ms
^c
$ cjdnstool ping irc.fc00.io -s -k
ctrl KEYPING 0000.0000.0027.82a3 (resolved from [session])
1518729042 0000.0000.0027.82a3 fdud7rqg7puz4hf6u4kztfku0pbujw88l29s4ugwhf61vgqv6cj0.k v=20 seq=0 time=175ms
1518729043 0000.0000.0027.82a3 fdud7rqg7puz4hf6u4kztfku0pbujw88l29s4ugwhf61vgqv6cj0.k v=20 seq=1 time=146ms
^C
$
```

### cjdnstool query getpeers

Send a sequence of pathfinder GetPeers queries to the other node and print the result.
The GetPeers query does not return all of the peers of a given node in one shot, multiple
queries must be made in order to get the whole list.

Because of a bug in v20 nodes, the subnode pathfinder does not always know about all peers,
this bug was fixed in v20.1 but for some nodes it persists. By defauly this tool will
make a query which is handled by the old pathfinder which has no such bug but by passing
the `-2` flag, you can query the subnode pathfinder.

#### Options

* `-2`: Flag the query in such a way that it will be handled by the *subnode* pathfinder
rather than by the old pathfinder.
* `-v`, `--verbose`: Print additional debugging information
* `-p <pref>`, `--pref=<pref>`: Use the specified resolution preference, for example
`session,snode,pf` (the default) will try first to use what is in the session manager,
then it will try querying the supernode, then it will try the old pathfinder. If you
specify only 1 or 2 of the 3 options, the other option(s) will be skipped which may result
in a failure to resolve the domain.

#### Example

```
$ cjdnstool query getpeers irc.fc00.io
Peers for v20.0000.0000.0007.cd45.fdud7rqg7puz4hf6u4kztfku0pbujw88l29s4ugwhf61vgqv6cj0.k (resolved from [snode])
v20.0000.0000.0000.0001.fdud7rqg7puz4hf6u4kztfku0pbujw88l29s4ugwhf61vgqv6cj0.k
v20.0000.0000.0000.0082.p0tsd5589yy3ph769ktk5cwcgkubqjdtrlhsq3hjsy9wwlhjhfk0.k
v20.0000.0000.0000.0086.1941p5k8qqvj17vjrkb9z97wscvtgc1vp8pv1huk5120cu42ytt0.k
v20.0000.0000.0000.008a.8hgr62ylugxjyyhxkz254qtz60p781kbswmhhywtbb5rpzc5lxj0.k
v20.0000.0000.0000.0092.2z5lkm9d7c8rbc77qty33sfv050mj5fpc6wjfbbqjyb7kxbrxvj0.k
v20.0000.0000.0000.0096.5lt1py8x0mfy1h44gmp7b2277t2t3mv5ppt56gpgyhgbwjunf020.k
v20.0000.0000.0000.009a.u64fnj4b3s0mcbgf9zfh08qbxh556p8z2z2plw2qp97bpcdg6gf0.k
v20.0000.0000.0000.009e.7jljkrtc4t6g87styqmbgj6d2ff2jlq4yhnzq85lnwp4tydu19q0.k
v20.0000.0000.0000.00a2.ywx5ykk2xnnpth9wqbzb59whpzlqx95zrpyg2u6xukf85y6zws10.k
v20.0000.0000.0000.00a6.ubbtkp0txwjh44v8kkznvhjqqwr1hd2jzv5ms9zlkfk25svxvtg0.k
v20.0000.0000.0000.00aa.hyj4xmkz00z02vf5n3cwft2yfgg91dfmmq7stjjz09w4lxgnxkz0.k
v20.0000.0000.0000.00ae.7vgm4mwzhuc8wjx4grd5km66qtb641llyv48g8qvcfntvy772820.k
v20.0000.0000.0000.00b2.5wfwcfyhpn3gkmy89r9prw1csx4t4q4nbmscqp040bzmm7mbh8b0.k
v20.0000.0000.0000.00b6.ckpd4v8sgwsds7vx1qhdm8uufnj62wb0l4pgzns3zxc4whv3brq0.k
v20.0000.0000.0000.00ba.2hwmvzgxhy6h02zsk81cz2h4ybwh1hxjtsk7j8cu9954lzwgu8t0.k
v20.0000.0000.0000.00be.5msc47cgr8h1bqtnq9xyb0hr9rbqp2qlq3t1v14rk5y727z03390.k
v20.0000.0000.0000.00c2.6bb1kywn12w8n3crvzx7r21d2x4j4bst4zythd3rrnvckjtu0sq0.k
v20.0000.0000.0000.00c6.11sfkq2clbv4dgzgx8hm47p4ld9pwy82y7jluvjh91cyl1n7bwf0.k
Total 18 peers
$
```

### cjdnstool peer show

Print a list of the peers of this node according to the InterfaceController. This is
equivilent to `./tools/peerStats`

#### Options

* `-6`, `--ip6`: Print peers with their cjdns IPv6 rather than their pubkeys

### cjdnstool session show

Print a list of the active sessions of this node according to the SessionManager.
This is equivilent to `./tools/sessionStats`

#### Options

* `-6`, `--ip6`: Print sessions with their cjdns IPv6 rather than their pubkeys

### cjdnstool util

These are utility functions which do not require the cjdns node to be running in order
to use them.

#### cjdnstool util key2ip6

Convert one or more cjdns public keys into cjdns IPv6 addresses. This command has no options.

##### Example

```
$ cjdnstool util key2ip6 kw0vfw3tmb6u6p21z5jmmymdlumwknlg3x8muk5mcw66tdpqlw30.k cmnkylz1dx8mx3bdxku80yw20gqmg0s9nsrusdv0psnxnfhqfmu0.k
kw0vfw3tmb6u6p21z5jmmymdlumwknlg3x8muk5mcw66tdpqlw30.k fc02:2735:e595:bb70:8ffc:5293:8af8:c4b7
cmnkylz1dx8mx3bdxku80yw20gqmg0s9nsrusdv0psnxnfhqfmu0.k fcbb:5056:899e:2838:f1ad:12eb:9704:1ff1
$
```

#### cjdnstool util priv2pub

Convert one or more cjdns private keys (in hexidecimal format) into public keys in base64.

##### Example

```
$ cjdnstool util priv2pub 28ee6a11ab624cf8750e255e347909bb35f10291b972b6fb261a534798049d66
vn2hwbvnvyky9wcgrlwyl4vnqn63z73bvqky1hslt3n4ur0mnpv0.k
$
```

#### cjdnstool util keygen

Generate a new cjdns keypair, outputs a private key in hex, a public key in base64 and an
IPv6 address. This command takes no arguments.

##### Example

```
$ cjdnstool util keygen
28ee6a11ab624cf8750e255e347909bb35f10291b972b6fb261a534798049d66 vn2hwbvnvyky9wcgrlwyl4vnqn63z73bvqky1hslt3n4ur0mnpv0.k fc83:54f8:7f02:75c0:e2ac:d575:4b4d:eb28
```

### cjdnstool mon pf

Monitor incoming and outgoing inter-pathfinder traffic in cjdns, each message will start with
an arrow pointing either left or right. If it points left then the message is outgoing and if
it points right then the message is incoming. This command has no options.

#### Example

```
$ cjdnstool mon pf
> v17 0000.0000.000a.e553 fcfd:9511:69cc:a05e:4eb2:ed20:c6a0:52e3 fn fcdb:4cd0:d748:0b1f:4eaf:5c9e:8cd9:b815
< v17 0000.0000.000a.e553 fcfd:9511:69cc:a05e:4eb2:ed20:c6a0:52e3 reply
> v17 0000.0000.000a.e553 fcfd:9511:69cc:a05e:4eb2:ed20:c6a0:52e3 fn fcdb:4cd0:d748:0b1f:4eaf:5c9e:8cd9:b815
< v17 0000.0000.000a.e553 fcfd:9511:69cc:a05e:4eb2:ed20:c6a0:52e3 reply
^C
$
```

### cjdnstool mon ctrl

Monitor incoming and outgoing switch CTRL traffic on this cjdns node. Each message will begin
with an arrow pointing either left or right, if it points left then this is an outgoing
message and if it points right then it's an incoming message. This command has no options.

#### Example

```
$ cjdnstool mon ctrl
Listening for CTRL traffic on node
> 0000.0000.0006.f7a5 ERROR AUTHENTICATION label_at_err_node: 64e9.4c00.0000.0000 nonce: 1 00d596edf689e7fe14de00000000000b00000000
> 0000.0000.0006.4dc5 ERROR AUTHENTICATION label_at_err_node: cc12.2000.0000.0000 nonce: 1 00866a1edb69ced59e0800000000000b00000000
^C
$
```

### cjdnstool mon snode

Monitor traffic to and from the supernode. This will print all of the messages going to and from
the snode which are either CTRL messages or are DHT messages *that are snode queries and replies*,
normal interactions with the cjdns engine running on the snode will not be printed. It takes no
arguments.

Types of messages sent to and from the snode:

* getRoute request: request for a path between two nodes in the network, given as IPv6.
* getRoute reply: response is a node list (of one) which contains the version and key of the
destination as well as a route which should work for the source, to get to that destination.
* ann: signed announcement of reachability, see [Cjdnsann](https://github.com/cjdelisle/cjdnsann.git).
* ann reply: reply from the snode, contains `stateHash` which is compared with the node's local
state in order to ensure that they are aligned.

#### Example

```
$ cjdnstool mon snode
< getRoute fc92:8136:dc1f:e6e0:4ef6:a6dd:7187:b85f fcec:ae97:8902:d810:6c92:ec67:efb2:3ec5
< getRoute fc92:8136:dc1f:e6e0:4ef6:a6dd:7187:b85f fc8b:7aa7:e2bf:c82b:4fa3:57a4:de2a:52a3
< getRoute fc92:8136:dc1f:e6e0:4ef6:a6dd:7187:b85f fc8b:7aa7:e2bf:c82b:4fa3:57a4:de2a:52a3
< getRoute fc92:8136:dc1f:e6e0:4ef6:a6dd:7187:b85f fcde:5b9e:fe85:5af7:5368:6dff:729d:f859
< getRoute fc92:8136:dc1f:e6e0:4ef6:a6dd:7187:b85f fcde:5b9e:fe85:5af7:5368:6dff:729d:f859
> reply [
    "v20.0000.0000.1b2c.1405.fdyb6wrbnvr8qfr7uds81f8dxfgl7xj2shumtwx9szkpkz8j01y0.k"
]
> reply [
    "v20.0000.0000.1b2c.1405.fdyb6wrbnvr8qfr7uds81f8dxfgl7xj2shumtwx9szkpkz8j01y0.k"
]
^C
$
```

### cjdnstool resolve

Resolve a hostname or cjdns IPv6 address to a version, path and key which can be used for sending
a ping. This resolution happens every time you start a session with a previously unknown node.

The resolution may come from either an already known session in the SessionManager, or from the
supernode or from the old pathfinder. By default this command will return all of them.

With the session manager result there will be a metric, specifying how valuable the information is
considered (lower is better).

* `metric=fff00000`: means the SessionManager discovered the node because it's a peer.
* `metric=fff00033`: means the SessionManager discovered the path from the supernode.
* `metric=ffff0000`: means the SessionManager discovered the path from the old pathfinder.

#### Options

* `-v`, `--verbose`: Print additional debugging information
* `-p <pref>`, `--pref=<pref>`: Use the specified resolution preference, for example
`session,snode,pf` (the default) will try first to use what is in the session manager,
then it will try querying the supernode, then it will try the old pathfinder. If you
specify only 1 or 2 of the 3 options, the other option(s) will be skipped which may result
in a failure to resolve the domain.

#### Example
```
$ cjdnstool resolve irc.fc00.io -p pf,snode
Resolving irc.fc00.io
snode   v20.0000.0000.0004.d005.fdud7rqg7puz4hf6u4kztfku0pbujw88l29s4ugwhf61vgqv6cj0.k
pf      v20.0000.0000.0004.d005.fdud7rqg7puz4hf6u4kztfku0pbujw88l29s4ugwhf61vgqv6cj0.k
$ cjdnstool resolve irc.fc00.io -p session
Resolving irc.fc00.io
session v20.0000.0000.0007.cd45.fdud7rqg7puz4hf6u4kztfku0pbujw88l29s4ugwhf61vgqv6cj0.k metric=fff00033
$
```

### cjdnstool cexec

Execute a direct RPC call to the cjdns engine. Everything in cjdnstool uses these RPCs
to access data from and to control cjdns but this is a raw access to the cjdns RPC calls.
There are many calls which are documented to varying extents. The names of the calls
always begin with the name of the .c file where they are defined so even if the call is
not well documented, finding the source code is reasonable.

The best documentation to be found on these RPC calls is here:
https://github.com/cjdelisle/cjdns/blob/master/doc/admin-api.md#cjdns-functions

In general it's better to use the tools provided in cjdnstool but if you want to access
something internal, these RPCs are the best option.

#### Options

Each RPC call has different options which are shown when you execute `cjdnstool cexec`
with no arguments. All options must be in the form `--<name>=<value>` and if the option
is shown in square brackets, it is optional.

#### Example

```
$ cjdnstool cexec ReachabilityCollector_getPeerInfo --page=0
{
  "error": "none",
  "peers": [
    {
      "addr": "v20.0000.0000.0000.0015.kw0vfw3tmb6u6p21z5jmmymdlumwknlg3x8muk5mcw66tdpqlw30.k",
      "pathThemToUs": "0000.0000.0000.04cc",
      "querying": 0
    },
    {
      "addr": "v20.0000.0000.0000.0013.cmnkylz1dx8mx3bdxku80yw20gqmg0s9nsrusdv0psnxnfhqfmu0.k",
      "pathThemToUs": "0000.0000.0000.00b6",
      "querying": 0
    }
  ]
}
$
```

### cjdnstool log

Cjdns DEBUG level logging is more like a sort of tracepoint or kprobe, when you enable logging
it prints a fantastic amount of noise. Fortunartely for performance, the logs are not even
created inside of cjdns unless logging is enabled. You can enable logging on a verbosity,
per-file and per-line basis.

For example `cjdnstool log -f CryptoAuth.c` will take all logs from CryptoAuth file.
`cjdnstool log -v INFO` will collect logs at INFO level or higher.
`cjdnstool log -f CryptoAuth.c -l 727` will collect logs only from one line in the CryptoAuth
file (assuming there is a log line there).

If you call `cjdnstool log` with no arguments, it will simply print all logs.

#### Options

Each option can be specified only once, but options can be used together.

* `-v <verb>`, `--verbosity=<verb>`: Specify the level of verbosity for logging, each level
implies the higher levels so if you specify INFO, it will log INFO, WARN and CRITICAL levels.
* `-f <file>`, `--file=<file>`: Limit logging to one file, this helps when you only want to
see what's going on inside of one particular module.
* `-l <line>`, `--line=<line>`: Limit logging to one specific line number, this is
most useful in conjunction with `--file` to only listen to invocations of one particular log
line.

#### Example

```
$ cjdnstool log
1483311804 DEBUG SessionManager.c:380 ver[17] send[18269] recv[379733] ip[fcc7:91f7:ab6f:85b7:5bfc:790a:31c8:dd38] path[0000.0000.0037.91c5] new session nonce[3]
1483311804 DEBUG CryptoAuth.c:628 0x7ff313e860b8 inner [fcc7:91f7:ab6f:85b7:5bfc:790a:31c8:dd38] state[0]: Received a repeat key packet
1483311804 DEBUG CryptoAuth.c:631 0x7ff313e860b8 inner [fcc7:91f7:ab6f:85b7:5bfc:790a:31c8:dd38] state[0]: DROP a stray key packet
1483311804 DEBUG SessionManager.c:391 ver[17] send[18269] recv[379733] ip[fcc7:91f7:ab6f:85b7:5bfc:790a:31c8:dd38] path[0000.0000.0037.91c5] DROP Failed decrypting message NoH[3] state[INIT]
1483311804 DEBUG SessionManager.c:380 ver[17] send[18269] recv[379733] ip[fcc7:91f7:ab6f:85b7:5bfc:790a:31c8:dd38] path[0000.0000.0037.91c5] new session nonce[3]
1483311804 DEBUG CryptoAuth.c:628 0x7ff313e860b8 inner [fcc7:91f7:ab6f:85b7:5bfc:790a:31c8:dd38] state[0]: Received a repeat key packet
^CDisconnecting...
done
$ cjdnstool log -v INFO
1483311840 INFO SwitchCore.c:194 no such iface
1483311841 INFO ControlHandler.c:224 DROP ctrl packet from [0000.000d.a193.4585] with invalid checksum
1483311842 INFO SwitchCore.c:194 no such iface
^CDisconnecting...
done
$ node cjdnstool log -f ControlHandler.c -l 224
1483311886 INFO ControlHandler.c:224 DROP ctrl packet from [0000.5750.a6c4.23a3] with invalid checksum
^CDisconnecting...
done
$
```

### cjdnstool snode

Cjdns uses a supernode to aid in finding routes to things, you can configure which supernode
to use or you can allow it to use the supernode used by your peers. If the supernode comes
from one of your peers, it will try to select supernodes used by the lower peers in the list
(outgoing peers which you have ostensibly configured in your cjdroute.conf file).

#### cjdnstool snode show

Show the currently used supernode, this command takes no options. The result shows whether
the supernode is "authorized" meaning whether it was manually configured or was automatically
detected.

##### Example

```
$ cjdnstool snode show
v20.0000.0000.0004.f2a3.9syly12vuwr1jh5qpktmjc817y38bc9ytsvs8d5qwcnvn6c2lwq0.k authorized=false
$
```

#### cjdnstool snode ls

List configured supernodes, this command takes no options. The result will be the list of
all public keys of the supernodes which have been configured in the cjdroute.conf file.

##### Example

```
$ cjdnstool snode ls
9syly12vuwr1jh5qpktmjc817y38bc9ytsvs8d5qwcnvn6c2lwq0.k
$
```

### cjdnstool passwd

This submodule is for managing the authorized passwords which allow peering. Each password
has a "login" name associated and that name is needed for the other side to authenticate.

If no command is given, the default is `cjdnstool passwd show`.

#### cjdnstool passwd show

Show the list of configured passwords which other nodes can use for connecting. This will
show the username to login but not the actual password itself. This command takes no options.

##### Example

```
$ cjdnstool passwd show
Anon #1
Local Peers
$
```

### cjdnstool iptun

This is for configuring the IPTunnel submodule which is used for issuing IPv4 and IPv6
addresses to a cjdns node and converting it to a VPN client. The format of an address
is `1.2.3.4/5:6` or `1234::/5:6` the 5:6 is to be interpreted as:

address SLASH prefix_announced_to_client COLON size_of_address_block_issued_to_client

For example: 192.168.123.0/0:24 will be issuing the address block 192.168.123.0/24 to
the client and then announcing /0 (whole internet) to the client.

For a smaller network (business VPN for example), you might use 10.118.12.3/16:32 issuing
a /32 (1 address) to the client but announcing to the a /16, the whole company network.

#### cjdnstool iptun show

This shows the list of all configured IPTunnel connections (servers for which you are
the client and clients for which you are the server). It takes no arguments.

##### Example

```
$ cjdnstool iptun show
SERVER cmnkylz1dx8mx3bdxku80yw20gqmg0s9nsrusdv0psnxnfhqfmu0.k 10.66.6.1/0:32 2c0f:f930:2:1::/0:64
```

This is showing a SERVER (for which we are the client), and that server has issued us
10.66.6.1/0:32 (allocating us 1 address, but instructing us to route the whole internet there)
and 2c0f:f930:2:1::/0:64 (allocating us a /64 block of IPv6 and instructing us to route
the whole internet there).

### cjdnstool iface

Cjdns connects to peers via pluggable interfaces, there are the UDPInterface and the
ETHInterface classes of interfaces but other interfaces can easily be developed. Of
these classes, there may be multiple actual interfaces which corrispond to (for example)
the UDP/IPv4 stack vs. the UDP/IPv6 stack, or ETHInterface instances connected to
different ethernet devices.

#### cjdnstool iface show

This shows a list of all the configured interfaces, this command takes no arguments and
it is the default command, so typing `cjdnstool iface` will do the same thing. The output
is the interface number (needed when configuring new peers), the name of the interface,
and the beaconing state (whether it is sending beacon messages to search for new peers).

##### Example

This shows 2 UDPInterface instances, 1 configured for IPv4 and 1 configured for IPv6.

```
$ cjdnstool iface show
1 	UDP/IPv6/[::]:51056	beaconState=DISABLED
0 	UDP/IPv4/0.0.0.0:51056	beaconState=SENDING
$
```

### cjdnstool traceroute

Give the list of nodes between your node and the target of the traceroute. The target
can be given in any way that is accepted by `cjdnstool resolve`. There are 3 options
to this command.

* `-2` Use the subnode pathfinder for resolving the getPeers requests which are needed
to perform the traceroute. Because in certain versions, the subnode pathfinder's getPeers
handler had a bug (present in 20.0 and 20.1, fixed in 20.2), this is disabled by default,
but it can be effective for detecting the nodes which are running the problematic version.
* `-v`, `--verbose` Print extra debug information.
* `-p <pref>`, `--pref=<pref>` Use this method of resolving the path, see
[cjdnstool resolve](https://github.com/cjdelisle/cjdnstool#cjdnstool-resolve) for more
information.

The way this traceroute works is by performing getPeers requests in sequence to your own
node and then to each node along the path, following the node which is in the path to the
final destination.

#### Example

```
$ cjdnstool traceroute fcfc:5d70:99b6:4e0c:cba6:61ec:434b:df1a
traceroute v17.0000.0000.0005.d3a3.h4quw20xhnz4m40l5td9h6qhug86yghs83w54qd0v7fzywdsh700.k (getPeers) (resolved from [session])
v20.0000.0000.0000.0001.3fdqgz2vtqb0wx02hhvx3wjmjqktyt567fcuvj3m72vw5u6ubu70.k 3ms
v20.0000.0000.0000.0013.cmnkylz1dx8mx3bdxku80yw20gqmg0s9nsrusdv0psnxnfhqfmu0.k 32ms
v20.0000.0000.0000.0ba3.cnm1119sxujn7judmpnj100j8mmvxgyrqb250ldx61p3rh6d0dc0.k 51ms
v17.0000.0000.0005.d3a3.h4quw20xhnz4m40l5td9h6qhug86yghs83w54qd0v7fzywdsh700.k 59ms
```

### cjdnstool conf

These commands are for manipulating the cjdns config file format. That format is JSON with
C and C++ style comments but without floating points numbers, null, nor the boolean type.
Before any sub-command, you can specify `-f <filename>` or `--file=<filename>` in order to
provide a particular path to the cjdns conf file, otherwise it will default to using
`/etc/cjdroute.conf`.

#### cjdnstool conf migrate

Before you can make changes to a cjdns conf file, it must be migrated to version 2.
Historically, cjdns was known for accepting conf files with errors such as missing
commas or even arbitrary text in certain places. Version 2 forbids such things
but files which do not specify `version: 2` will be treated by cjdns as version 1
in order to avoid surprise no-start on upgrade. `cjdnstool conf migrate` will make
parse and then re-serialize your conf file (preserving comments!) and it will then
add `version: 2` flag to the end of the conf file in order to indicate to cjdns that
it should from now on be parsed in strict mode. Your old conf file will be preserved
as `<name of your conf file>.old`.

Options to `cjdnstool conf migrate` are as follows:
* `-y` Treat the answer as yes, you will not be prompted - use with caution.
* `-d`, `--dryrun` Do not actually edit the conf file, just print a *unified diff*
patch showing what would be changed and then exit.

##### Example

```
$ cjdnstool conf --file=./cjdroute-new.conf migrate
Index: ./cjdroute-new.conf
===================================================================
--- ./cjdroute-new.conf
+++ ./cjdroute-new.conf
@@ -274,13 +274,14 @@
     },

     // If set to non-zero, cjdns will not fork to the background.
     // Recommended for use in conjunction with "logTo":"stdout".
-    "noBackground": 0
+    "noBackground": 0,

     // Pipe file will store in this path, recommended value: /tmp (for unix),
     // \\.\pipe (for windows)
     // /data/local/tmp (for rooted android)
     // /data/data/AppName (for non-root android)
     // This only needs to be specified if cjdroute's guess is incorrect
     // "pipe": "/tmp"
+    "version": 2
 }


Making these changes in file [./cjdroute-new.conf]
Old version will be stored in [./cjdroute-new.conf.old]
Is this ok? [Y/n] Y
./cjdroute-new.conf written
$
```

#### cjdnstool conf put

Once you have migrated your conf file, you can now make changes to it programmatically.
Your changes will be performed using [cjdnsconf](https://github.com/cjdelisle/cjdnsconf)
which will do its best to preserve comments and empty lines while altering the config
file. `cjdnstool conf put` takes 2 mandatory arguments: path and value. The path is a
JSON path, e.g. `security[0].name` and the value is a number, string or piece of JSON.

Options for `cjdnstool conf put` are as follows:
* `-d`, `--dryrun` Do not actually edit the conf file, just print a *unified diff*
patch showing what would be changed and then exit.

Tips:
* If you want to delete an entry, you can do so by assigning it to null.
* If you want to assign an entry to a string value which *could* parse as JSON, be
careful to quote the string in order to avoid it being parsed before assignment.
For example if you want to assign something to a string which is: `[2]`, you should
use `cjdnstool conf put whatever.path '"[2]"'` because otherwise it will be assigned
to a single element array containing the number 2.

##### Example

With the `-d` (dryrun) feature, you can see what your command *would* do if it was
given, the output will be a patch in unified diff format.

```
$ cjdnstool conf put -d admin.password very_secret
Index: /etc/cjdroute.conf
===================================================================
--- /etc/cjdroute.conf
+++ /etc/cjdroute.conf
@@ -53,9 +53,9 @@
         // Port to bind the admin RPC server to.
         "bind": "127.0.0.1:11234",

         // Password for admin RPC server.
-        "password": "NONE"
+        "password": "very_secret"
     },

     // Interfaces to connect to the switch core.
     "interfaces": {

```

Since null is not allowed in cjdns config objects, setting an entry to null deletes
that entry. Furthermore, deleting an entry in a list or dictionary will clean out all
comments which are just before that entry.

```
$ cjdnstool conf put -d security[4] null
Index: /etc/cjdroute.conf
===================================================================
--- /etc/cjdroute.conf
+++ /etc/cjdroute.conf
@@ -240,15 +240,8 @@
         // this prevents many types of exploits from attacking the wider system.
         // Default: enabled
         { "noforks": 1 },

-        // Seccomp is the most advanced sandboxing feature in cjdns, it uses
-        // SECCOMP_BPF to filter the system calls which cjdns is able to make on a
-        // linux system, strictly limiting it's access to the outside world
-        // This will fail quietly on any non-linux system
-        // Default: enabled
-        { "seccomp": 1 },
-
         // The client sets up the core using a sequence of RPC calls, the responses
         // to these calls are verified but in the event that the client crashes
         // setup of the core completes, it could leave the core in an insecure state
         // This call constitutes the client telling the core that the security rules

```

You can assign entire blocks of JSON to parts of the conf, but beware, any comments
which live inside of that JSON block will go away.

```
$ cjdnstool conf put -d logging '{ "logTo": "stdout" }'
Index: /etc/cjdroute.conf
===================================================================
--- /etc/cjdroute.conf
+++ /etc/cjdroute.conf
@@ -258,13 +258,9 @@
         { "setupComplete": 1 }
     ],

     // Logging
-    "logging": {
-        // Uncomment to have cjdns log to stdout rather than making logs available
-        // via the admin socket.
-        //        "logTo":"stdout"
-    },
+    "logging": { "logTo": "stdout" },

     // If set to non-zero, cjdns will not fork to the background.
     // Recommended for use in conjunction with "logTo":"stdout".
     "noBackground": 1,

```

You can also assign just a single entry in a block

```
$ cjdnstool conf put -d logging.logTo stdout
Index: /etc/cjdroute.conf
===================================================================
--- /etc/cjdroute.conf
+++ /etc/cjdroute.conf
@@ -262,8 +262,9 @@
     "logging": {
         // Uncomment to have cjdns log to stdout rather than making logs available
         // via the admin socket.
         //        "logTo":"stdout"
+        "logTo": "stdout"
     },

     // If set to non-zero, cjdns will not fork to the background.
     // Recommended for use in conjunction with "logTo":"stdout".

```

#### cjdnstool conf get

`cjdnstool conf get` works even without a version 2 configuration, so for this migration is
not necessary. Like `cjdnstool conf put`, `cjdnstool conf get` takes a JSON path which selects
an entry and it returns that entry. `cjdnstool conf get` takes no options.

##### Example

```
$ cjdnstool conf get admin.bind
127.0.0.1:11234
$ cjdnstool conf get logging.logTo
undefined
$ cjdnstool conf get security[2]
{"nofiles":0}
$ cjdnstool conf get router.ipTunnel.outgoingConnections[0]
cmnkylz1dx8mx3bdxku80yw20gqmg0s9nsrusdv0psnxnfhqfmu0.k
```